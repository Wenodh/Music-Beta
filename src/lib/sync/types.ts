export type SyncOperationType = 'favorite' | 'history' | 'bookmark' | 'playback_position';
export type SyncOperationAction = 'create' | 'update' | 'delete';

export interface SyncOperation<T = any> {
    id: string; // UUID
    type: SyncOperationType;
    action: SyncOperationAction;
    payload: T;
    createdAt: string;
    retryCount: number;
    deviceId: string;
}

export interface SyncState {
    status: 'syncing' | 'synced' | 'pending' | 'failed' | 'offline';
    lastSyncedAt?: string;
    pendingOperationsCount: number;
    error?: string;
}

export interface ConflictResolutionResult<T> {
    resolved: T;
    type: 'local' | 'remote' | 'merged';
}
