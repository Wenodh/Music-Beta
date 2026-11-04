import { supabase } from '../lib/supabase';
import { PublicParty, PartyReport } from '../features/session/sessionSlice';

const LOBBY_CHANNEL = 'room:lobby';

export const partyService = {
    /**
     * Broadcast an active public party announcement to all connected listeners in the lobby.
     * Upserts into PostgreSQL parties table if authenticated and table exists.
     */
    broadcastPartyUpdate: async (party: PublicParty) => {
        try {
            // Upsert into listening_rooms & parties tables if authenticated
            try {
                const nowIso = new Date(party.updatedAt).toISOString();
                if (party.hostId) {
                    await supabase.from('listening_rooms').upsert({
                        room_code: party.roomCode,
                        title: party.partyName,
                        host_id: party.hostId,
                        is_public: party.isPublic,
                        max_participants: party.maxParticipants || 100,
                        status: party.status || 'active',
                        updated_at: nowIso
                    }, { onConflict: 'room_code' });
                }

                await supabase.from('parties').upsert({
                    room_code: party.roomCode,
                    party_name: party.partyName,
                    description: party.description || '',
                    category: party.category || 'Trending',
                    host_id: party.hostId || null,
                    host_name: party.hostName,
                    host_avatar: party.hostAvatar,
                    song_title: party.songTitle || '',
                    song_artist: party.songArtist || '',
                    song_artwork: party.songArtwork || '',
                    participant_count: party.participantCount,
                    max_participants: party.maxParticipants || 100,
                    is_public: party.isPublic,
                    scheduled_start: party.scheduledStart || null,
                    status: party.status || 'active',
                    updated_at: nowIso
                }, { onConflict: 'room_code' });
            } catch {
                // Ignore DB error if offline or table unmigrated; Realtime is primary transport
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
            console.warn('[partyService] Lobby party update broadcast error:', e);
        }
    },

    /**
     * Remove party announcement when session ends.
     */
    broadcastPartyEnded: async (roomCode: string) => {
        try {
            try {
                const nowIso = new Date().toISOString();
                await supabase
                    .from('parties')
                    .update({ status: 'ended', updated_at: nowIso })
                    .eq('room_code', roomCode);

                await supabase
                    .from('listening_rooms')
                    .update({ status: 'ended', updated_at: nowIso })
                    .eq('room_code', roomCode);
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
            console.warn('[partyService] Lobby party ended broadcast error:', e);
        }
    },

    /**
     * Fetch active public parties from database categorized deterministically with Realtime fallback.
     */
    fetchPublicParties: async (category = 'All'): Promise<PublicParty[]> => {
        try {
            let query = supabase
                .from('parties')
                .select('*')
                .eq('is_public', true)
                .in('status', ['active', 'scheduled']);

            if (category !== 'All' && category !== 'Trending' && category !== 'Active Now' && category !== 'Starting Soon') {
                query = query.eq('category', category);
            } else if (category === 'Active Now') {
                query = query.eq('status', 'active');
            } else if (category === 'Starting Soon') {
                query = query.eq('status', 'scheduled').not('scheduled_start', 'is', null);
            }

            const { data, error } = await query
                .order('participant_count', { ascending: false })
                .order('updated_at', { ascending: false })
                .limit(30);

            if (!error && Array.isArray(data) && data.length > 0) {
                return data.map((d: any) => ({
                    roomCode: d.room_code,
                    partyName: d.party_name || 'Listening Party',
                    description: d.description || '',
                    category: d.category || 'Trending',
                    hostId: d.host_id,
                    hostName: d.host_name || 'Host',
                    hostAvatar: d.host_avatar,
                    songTitle: d.song_title,
                    songArtist: d.song_artist,
                    songArtwork: d.song_artwork,
                    participantCount: d.participant_count || 1,
                    maxParticipants: d.max_participants || 100,
                    isPublic: true,
                    scheduledStart: d.scheduled_start,
                    status: d.status || 'active',
                    updatedAt: new Date(d.updated_at).getTime()
                }));
            }
        } catch {
            // DB fallback
        }
        return [];
    },

    /**
     * Server-side Moderation: Submit an abuse or spam report.
     */
    reportPartyOrUser: async (report: PartyReport): Promise<{ success: boolean; message: string }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                return { success: false, message: 'You must be signed in to submit a report.' };
            }

            const { error } = await supabase.from('party_reports').insert({
                reported_by: userData.user.id,
                target_user_id: report.targetUserId || null,
                reason: report.reason,
                details: report.details || `Reported in room ${report.roomCode}`,
                status: 'pending'
            });

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true, message: 'Thank you. Your report has been submitted for review.' };
        } catch (e: any) {
            return { success: false, message: e.message || 'Report submission failed.' };
        }
    }
};
