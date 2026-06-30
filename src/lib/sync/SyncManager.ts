import { SyncOperation, SyncState, SyncOperationType, SyncOperationAction } from './types';
import { StorageService } from '../storage/StorageService';
import { getDeviceId } from '../storage/db';
import { supabase } from '../supabase';
import { eventBus } from '../events';

export class SyncManager {
    private isSyncing = false;
    private deviceId: string = '';
    private syncInterval: any;

    constructor() {
        this.init();
    }

    private async init() {
        this.deviceId = await getDeviceId();
        this.startSyncTimer();

        // Listen for online status
        window.addEventListener('online', () => this.sync());
    }

    private startSyncTimer() {
        // Periodic sync every 5 minutes
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => this.sync(), 5 * 60 * 1000);
    }

    async enqueue(type: SyncOperationType, action: SyncOperationAction, payload: any) {
        const operation: SyncOperation = {
            id: crypto.randomUUID(),
            type,
            action,
            payload,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            deviceId: this.deviceId,
        };

        await StorageService.addSyncOperation(operation);
        this.emitSyncState();

        // Immediate sync for high priority actions
        if (type === 'favorite' || type === 'bookmark' || type === 'follow' || type === 'playlist_op') {
            this.sync();
        }
    }

    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        this.isSyncing = true;
        this.emitSyncState();

        try {
            await this.processPendingOperations(user.id);
            await this.pullLatest(user.id);
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
            this.emitSyncState();
        }
    }

    private async processPendingOperations(userId: string) {
        const ops = await StorageService.getPendingOperations();

        for (const op of ops) {
            try {
                await this.applyOperation(userId, op);
                await StorageService.removeSyncOperation(op.id);
            } catch (error: any) {
                console.error(`Failed to apply operation ${op.id}:`, error);
                op.retryCount++;
                if (op.retryCount < 3) {
                    await StorageService.updateSyncOperation(op);
                } else {
                    // Permanent failure or max retries
                    await StorageService.removeSyncOperation(op.id);
                }
            }
        }
    }

    private async applyOperation(userId: string, op: SyncOperation) {
        const table = this.getTableName(op.type);

        if (op.action === 'create' || op.action === 'update') {
            const data = {
                ...op.payload,
                user_id: op.payload.user_id || userId,
                device_id: this.deviceId,
                updated_at: new Date().toISOString(),
                version: (op.payload.version || 0) + 1,
            };

            // Conflict Resolution Logic (Deterministic)
            if (op.type === 'playback_position') {
                const { data: existing } = await supabase
                    .from(table)
                    .select('version, updated_at')
                    .eq('user_id', userId)
                    .eq('provider', op.payload.provider)
                    .eq('media_id', op.payload.media_id)
                    .single();

                if (existing) {
                    const isRemoteNewer = existing.version > data.version ||
                        (existing.version === data.version && new Date(existing.updated_at) > new Date(data.updated_at));

                    if (isRemoteNewer) return;
                }
            }

            const { error } = await supabase
                .from(table)
                .upsert(data, { onConflict: this.getConflictColumns(op.type) });

            if (error) throw error;
        } else if (op.action === 'delete') {
            if (op.type === 'follow') {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .match({ follower_id: userId, following_id: op.payload.following_id });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from(table)
                    .update({ deleted_at: new Date().toISOString() })
                    .match(this.getMatchCriteria(op));
                if (error) throw error;
            }
        } else if (op.action === 'apply' && op.type === 'playlist_op') {
            // Apply operation-based sync for collaborative playlists
            const { error } = await supabase
                .from('playlist_operations')
                .insert({
                    playlist_id: op.payload.playlist_id,
                    user_id: userId,
                    op_type: op.payload.op_type,
                    payload: op.payload.payload,
                });
            if (error) throw error;
        }
    }

    private async pullLatest(userId: string) {
        // In a real implementation, we would fetch only changes since last sync
        // using the 'updated_at' and 'version' columns.

        const tables: SyncOperationType[] = ['favorite', 'history', 'bookmark', 'playback_position', 'profile', 'follow', 'playlist_member'];

        for (const type of tables) {
            const table = this.getTableName(type);
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error(`Failed to pull ${type}:`, error);
                continue;
            }

            if (data) {
                eventBus.emit('SYNC_DATA_RECEIVED', { type, data });
            }
        }

        await StorageService.setItem('lastSyncedAt', new Date().toISOString());
    }

    private getTableName(type: SyncOperationType): string {
        switch (type) {
            case 'favorite': return 'favorites';
            case 'history': return 'history';
            case 'bookmark': return 'bookmarks';
            case 'playback_position': return 'playback_positions';
            case 'profile': return 'profiles';
            case 'follow': return 'follows';
            case 'playlist_op': return 'playlist_operations';
            case 'playlist_member': return 'playlist_members';
            case 'notification_read': return 'notifications';
            default: return '';
        }
    }

    private getConflictColumns(type: SyncOperationType): string {
        switch (type) {
            case 'favorite': return 'user_id,provider,media_id';
            case 'playback_position': return 'user_id,provider,media_id';
            case 'profile': return 'id';
            case 'follow': return 'follower_id,following_id';
            case 'playlist_member': return 'playlist_id,user_id';
            default: return 'id';
        }
    }

    private getMatchCriteria(op: SyncOperation): any {
        if (op.payload.id) return { id: op.payload.id };
        return { media_id: op.payload.media_id, provider: op.payload.provider };
    }

    private async emitSyncState() {
        const ops = await StorageService.getPendingOperations();
        const state: SyncState = {
            status: this.isSyncing ? 'syncing' : (ops.length > 0 ? 'pending' : 'synced'),
            lastSyncedAt: await StorageService.getItem('lastSyncedAt'),
            pendingOperationsCount: ops.length,
        };
        eventBus.emit('SYNC_STATE_CHANGED', state);
    }
}

export const syncManager = new SyncManager();
