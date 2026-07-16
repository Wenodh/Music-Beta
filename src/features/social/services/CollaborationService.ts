import { supabase } from '../../../lib/supabase';
import { syncManager } from '../../../lib/sync/SyncManager';
import { CollaborativePlaylist, PlaylistOperation, PlaylistMember } from '../types';

export class CollaborationService {
    private static instance: CollaborationService;
    private activeSubscriptions: Map<string, any> = new Map();

    private constructor() {}

    public static getInstance(): CollaborationService {
        if (!CollaborationService.instance) {
            CollaborationService.instance = new CollaborationService();
        }
        return CollaborationService.instance;
    }

    async createPlaylist(name: string, isPublic: boolean = false): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('collaborative_playlists')
            .insert({
                owner_id: user.id,
                name,
                is_public: isPublic
            })
            .select()
            .single();

        if (error) throw error;

        await supabase.from('playlist_members').insert({
            playlist_id: data.id,
            user_id: user.id,
            role: 'owner'
        });

        return data.id;
    }

    async applyOperation(playlistId: string, opType: PlaylistOperation['opType'], payload: any): Promise<void> {
        await syncManager.enqueue('playlist_op', 'apply', {
            playlist_id: playlistId,
            op_type: opType,
            payload
        });
    }

    async subscribeToPlaylist(playlistId: string, onUpdate: (op: PlaylistOperation) => void) {
        if (this.activeSubscriptions.has(playlistId)) return;

        const subscription = supabase
            .channel(`playlist_ops:${playlistId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'playlist_operations',
                filter: `playlist_id=eq.${playlistId}`
            }, (payload) => {
                onUpdate(payload.new as PlaylistOperation);
            })
            .subscribe();

        this.activeSubscriptions.set(playlistId, subscription);
    }

    unsubscribeFromPlaylist(playlistId: string) {
        const sub = this.activeSubscriptions.get(playlistId);
        if (sub) {
            sub.unsubscribe();
            this.activeSubscriptions.delete(playlistId);
        }
    }

    async getPlaylist(playlistId: string): Promise<CollaborativePlaylist & { operations: PlaylistOperation[] }> {
        const { data: playlist, error: pError } = await supabase
            .from('collaborative_playlists')
            .select('*, playlist_members(*, profiles(*))')
            .eq('id', playlistId)
            .single();

        if (pError) throw pError;

        const { data: ops, error: oError } = await supabase
            .from('playlist_operations')
            .select('*')
            .eq('playlist_id', playlistId)
            .order('sequence_number', { ascending: true });

        if (oError) throw oError;

        return {
            ...playlist,
            operations: ops
        } as any;
    }

    async inviteMember(playlistId: string, userId: string, role: PlaylistMember['role'] = 'editor'): Promise<void> {
        const { error } = await supabase
            .from('playlist_members')
            .upsert({
                playlist_id: playlistId,
                user_id: userId,
                role
            });

        if (error) throw error;
    }

    async removeMember(playlistId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('playlist_members')
            .delete()
            .match({
                playlist_id: playlistId,
                user_id: userId
            });

        if (error) throw error;
    }
}

export const collaborationService = CollaborationService.getInstance();
