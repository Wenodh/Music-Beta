import { supabase } from '../lib/supabase';
import { Song } from '../types/music';

export interface PlaylistItem {
    id: string;
    playlistId: string;
    songId: string;
    songData: Song;
    position: number;
    addedBy: string;
    addedByName?: string;
    addedAt: string;
}

export interface PlaylistCollaborator {
    id: string;
    playlistId: string;
    userId: string;
    userName: string;
    avatarUrl?: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'invited' | 'accepted' | 'declined';
    createdAt: string;
}

export const playlistCollaborationService = {
    /**
     * Fetch normalized playlist items ordered by fractional position.
     */
    fetchPlaylistItems: async (playlistId: string): Promise<PlaylistItem[]> => {
        try {
            const { data, error } = await supabase
                .from('playlist_items')
                .select(`
                    id,
                    playlist_id,
                    song_id,
                    song_data,
                    position,
                    added_by,
                    added_at,
                    profiles:added_by (display_name, username)
                `)
                .eq('playlist_id', playlistId)
                .order('position', { ascending: true })
                .order('added_at', { ascending: true });

            if (error || !data) {
                return [];
            }

            return data.map((d: any) => ({
                id: d.id,
                playlistId: d.playlist_id,
                songId: d.song_id,
                songData: d.song_data,
                position: d.position,
                addedBy: d.added_by,
                addedByName: d.profiles?.display_name || d.profiles?.username || 'Collaborator',
                addedAt: d.added_at
            }));
        } catch (e) {
            console.warn('[playlistCollaborationService] fetchPlaylistItems error:', e);
            return [];
        }
    },

    /**
     * Add track to collaborative playlist using atomic server RPC with fractional position.
     */
    addTrackToPlaylist: async (playlistId: string, song: Song, targetPosition?: number): Promise<{ success: boolean; item?: PlaylistItem; message?: string }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                return { success: false, message: 'Sign in to edit collaborative playlists.' };
            }

            // Call atomic RPC
            const { data, error } = await supabase.rpc('add_collaborative_playlist_item', {
                target_playlist_id: playlistId,
                p_song_id: song.id,
                p_song_data: song,
                p_target_position: targetPosition || null
            });

            if (error || !data?.success) {
                return { success: false, message: error?.message || 'Failed to add track.' };
            }

            const item: PlaylistItem = {
                id: data.item_id,
                playlistId,
                songId: song.id,
                songData: song,
                position: data.position,
                addedBy: userData.user.id,
                addedByName: userData.user.user_metadata?.full_name || 'You',
                addedAt: new Date().toISOString()
            };

            // Broadcast change over Realtime channel
            const channel = supabase.getChannels().find(c => c.topic === `realtime:playlist:${playlistId}` || c.topic === `playlist:${playlistId}`);
            if (channel) {
                channel.send({
                    type: 'broadcast',
                    event: 'item_added',
                    payload: item
                });
            }

            return { success: true, item };
        } catch (e: any) {
            return { success: false, message: e.message || 'Error adding track.' };
        }
    },

    /**
     * Remove track from collaborative playlist with server-side authorization.
     */
    removeTrackFromPlaylist: async (playlistId: string, itemId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('playlist_items')
                .delete()
                .eq('id', itemId)
                .eq('playlist_id', playlistId);

            if (!error) {
                const channel = supabase.getChannels().find(c => c.topic === `realtime:playlist:${playlistId}` || c.topic === `playlist:${playlistId}`);
                if (channel) {
                    channel.send({
                        type: 'broadcast',
                        event: 'item_removed',
                        payload: { itemId, playlistId }
                    });
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Update fractional positions of items (reordering) with server-side authorization.
     */
    reorderItems: async (playlistId: string, itemId: string, newPosition: number): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('playlist_items')
                .update({ position: newPosition, updated_at: new Date().toISOString() })
                .eq('id', itemId)
                .eq('playlist_id', playlistId);

            if (!error) {
                const channel = supabase.getChannels().find(c => c.topic === `realtime:playlist:${playlistId}` || c.topic === `playlist:${playlistId}`);
                if (channel) {
                    channel.send({
                        type: 'broadcast',
                        event: 'items_reordered',
                        payload: { itemId, newPosition, playlistId }
                    });
                }
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Fetch playlist collaborators and their permissions.
     */
    fetchCollaborators: async (playlistId: string): Promise<PlaylistCollaborator[]> => {
        try {
            const { data, error } = await supabase
                .from('playlist_collaborators')
                .select(`
                    id,
                    playlist_id,
                    user_id,
                    role,
                    status,
                    created_at,
                    profiles:user_id (display_name, username, avatar_url)
                `)
                .eq('playlist_id', playlistId);

            if (error || !data) return [];

            return data.map((d: any) => ({
                id: d.id,
                playlistId: d.playlist_id,
                userId: d.user_id,
                userName: d.profiles?.display_name || d.profiles?.username || 'Collaborator',
                avatarUrl: d.profiles?.avatar_url,
                role: d.role as 'owner' | 'editor' | 'viewer',
                status: d.status as 'invited' | 'accepted' | 'declined',
                createdAt: d.created_at
            }));
        } catch {
            return [];
        }
    },

    /**
     * Non-destructive reconciliation: Compare legacy JSONB songs_data with normalized playlist_items.
     */
    reconcileWithLegacyJsonb: (legacySongs: Song[], normalizedItems: PlaylistItem[]): { match: boolean; legacyCount: number; normalizedCount: number } => {
        const legacyCount = legacySongs?.length || 0;
        const normalizedCount = normalizedItems?.length || 0;
        return {
            match: legacyCount === normalizedCount,
            legacyCount,
            normalizedCount
        };
    }
};
