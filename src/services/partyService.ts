import { supabase } from '../lib/supabase';
import { PublicParty } from '../features/session/sessionSlice';

const LOBBY_CHANNEL = 'room:lobby';

export const partyService = {
    /**
     * Broadcast an active public party announcement to all connected listeners in the lobby.
     */
    broadcastPartyUpdate: async (party: PublicParty) => {
        try {
            // First try database upsert if table exists
            try {
                await supabase.from('parties').upsert({
                    room_code: party.roomCode,
                    party_name: party.partyName,
                    host_name: party.hostName,
                    host_avatar: party.hostAvatar,
                    song_title: party.songTitle,
                    song_artist: party.songArtist,
                    song_artwork: party.songArtwork,
                    participant_count: party.participantCount,
                    is_public: party.isPublic,
                    updated_at: new Date(party.updatedAt).toISOString()
                }, { onConflict: 'room_code' });
            } catch {
                // Table might not exist; fallback to Realtime broadcast
            }

            // Realtime lobby broadcast channel
            let channel = supabase.getChannels().find(c => c.topic === `realtime:${LOBBY_CHANNEL}` || c.topic === LOBBY_CHANNEL);
            if (!channel) {
                channel = supabase.channel(LOBBY_CHANNEL);
                await new Promise<void>((resolve) => {
                    channel!.subscribe((status) => {
                        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            resolve();
                        }
                    });
                });
            }

            await channel.send({
                type: 'broadcast',
                event: 'party_update',
                payload: party
            });
        } catch (e) {
            console.warn('Lobby party update broadcast error:', e);
        }
    },

    /**
     * Remove party announcement when session ends.
     */
    broadcastPartyEnded: async (roomCode: string) => {
        try {
            try {
                await supabase.from('parties').delete().eq('room_code', roomCode);
            } catch {
                // Table might not exist; fallback to Realtime broadcast
            }

            let channel = supabase.getChannels().find(c => c.topic === `realtime:${LOBBY_CHANNEL}` || c.topic === LOBBY_CHANNEL);
            if (!channel) {
                channel = supabase.channel(LOBBY_CHANNEL);
                await new Promise<void>((resolve) => {
                    channel!.subscribe((status) => {
                        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            resolve();
                        }
                    });
                });
            }

            await channel.send({
                type: 'broadcast',
                event: 'party_ended',
                payload: { roomCode }
            });
        } catch (e) {
            console.warn('Lobby party ended broadcast error:', e);
        }
    },

    /**
     * Fetch active public parties from database and/or realtime channel.
     */
    fetchPublicParties: async (): Promise<PublicParty[]> => {
        try {
            const { data, error } = await supabase
                .from('parties')
                .select('*')
                .eq('is_public', true)
                .order('updated_at', { ascending: false })
                .limit(20);

            if (!error && Array.isArray(data) && data.length > 0) {
                return data.map((d: any) => ({
                    roomCode: d.room_code,
                    partyName: d.party_name || 'Listening Party',
                    hostName: d.host_name || 'Host',
                    hostAvatar: d.host_avatar,
                    songTitle: d.song_title,
                    songArtist: d.song_artist,
                    songArtwork: d.song_artwork,
                    participantCount: d.participant_count || 1,
                    isPublic: true,
                    updatedAt: new Date(d.updated_at).getTime()
                }));
            }
        } catch {
            // DB fallback
        }
        return [];
    }
};
