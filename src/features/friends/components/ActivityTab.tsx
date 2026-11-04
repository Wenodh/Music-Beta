import React from 'react';
import {
    IoPlay,
    IoPause,
    IoMusicalNotes,
    IoDiscOutline,
    IoTimeOutline,
    IoLockClosedOutline,
    IoPeopleOutline,
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { playMusic } from '../../musicplayer/musicPlayerSlice';
import { musicApiService } from '../../../services/musicApiService';
import { showToast } from '../../ui/uiSlice';
import { setActiveProfileView } from '../../social/socialSlice';
import { Friendship } from '../../../types/social';

export const ActivityTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { cloudFriends, onlinePresenceMap } = useAppSelector((state) => state.social);
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);

    const handlePlayFriendSong = async (friendSong: any) => {
        if (!friendSong?.id) return;

        dispatch(showToast({ message: `Loading: ${friendSong.title}...` }));
        try {
            // Fetch complete playback details for the song via musicApiService
            const res = await musicApiService.fetchWithFallback(`/api/songs/${friendSong.id}`);
            const songData = res?.data?.[0] || res?.[0] || res?.data;

            if (songData) {
                // Map and play immediately while preserving existing user queue
                const mappedSong = {
                    id: songData.id,
                    name: songData.name || friendSong.title,
                    title: songData.name || friendSong.title,
                    artist: songData.primaryArtists || friendSong.artist,
                    primaryArtists: songData.primaryArtists || friendSong.artist,
                    image: songData.image || friendSong.artworkUrl,
                    url: songData.downloadUrl?.[4]?.link || songData.downloadUrl?.[0]?.link || songData.url,
                    downloadUrl: songData.downloadUrl,
                    duration: songData.duration,
                };
                dispatch(playMusic({ ...mappedSong, forcePlay: true }));
                dispatch(showToast({ message: `Playing ${mappedSong.title}` }));
            } else {
                dispatch(showToast({ message: 'Could not load stream for this track', type: 'error' }));
            }
        } catch (e: any) {
            dispatch(showToast({ message: e.message || 'Error playing friend track', type: 'error' }));
        }
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-black/20">
                <div className="p-3 bg-white/5 rounded-2xl mb-3 text-primary">
                    <IoDiscOutline size={28} />
                </div>
                <p className="text-xs font-bold text-white mb-1">Live Listening Activity</p>
                <p className="text-[11px] text-gray-400 max-w-[220px]">
                    Sign in to see what your friends are listening to in real-time and jump into their tracks.
                </p>
            </div>
        );
    }

    if (cloudFriends.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-black/20">
                <div className="p-3 bg-white/5 rounded-2xl mb-3 text-gray-400">
                    <IoPeopleOutline size={28} />
                </div>
                <p className="text-xs font-bold text-gray-300 mb-1">No Friends Yet</p>
                <p className="text-[11px] text-gray-500 max-w-[220px]">
                    Discover friends in the Discover tab to start seeing their live listening activity here.
                </p>
            </div>
        );
    }

    // Pair friends with their presence data
    const friendsWithActivity = cloudFriends.map((f: Friendship) => {
        const friendId = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
        const profile = f.friend_profile;
        const presence = onlinePresenceMap[friendId] || { online: false, lastSeen: 0, currentSong: null };
        return {
            friendId,
            profile,
            presence,
        };
    });

    // Sort: actively playing music first, then online, then offline
    const sorted = [...friendsWithActivity].sort((a, b) => {
        const aPlaying = a.presence.currentSong?.isPlaying ? 1 : 0;
        const bPlaying = b.presence.currentSong?.isPlaying ? 1 : 0;
        if (aPlaying !== bPlaying) return bPlaying - aPlaying;

        const aOnline = a.presence.online ? 1 : 0;
        const bOnline = b.presence.online ? 1 : 0;
        return bOnline - aOnline;
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black/20 overflow-y-auto custom-scrollbar p-3 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">Friends Activity ({sorted.length})</span>
                <span className="text-[10px] text-gray-500">Live Presence</span>
            </div>

            <div className="space-y-2">
                {sorted.map(({ friendId, profile, presence }) => {
                    const name = profile?.display_name || 'Vibe Friend';
                    const isOnline = presence.online;
                    const song = presence.currentSong;
                    const isActivelyPlaying = song && song.isPlaying;

                    return (
                        <div
                            key={friendId}
                            onClick={() => profile && dispatch(setActiveProfileView(profile))}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 flex flex-col gap-2.5 cursor-pointer transition-all"
                        >
                            {/* Friend Header */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative">
                                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-primary font-bold text-xs border border-white/10">
                                            {name[0]?.toUpperCase()}
                                        </div>
                                        {/* Presence dot */}
                                        <span
                                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950 ${
                                                isOnline ? 'bg-green-400' : 'bg-gray-600'
                                            }`}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{name}</p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {isOnline ? (
                                                <span className="text-green-400 font-semibold">Online now</span>
                                            ) : (
                                                <span>Offline</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {isActivelyPlaying && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[10px] text-primary font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                        <span>Listening</span>
                                    </div>
                                )}
                            </div>

                            {/* Currently Playing Track Card (if shared and active) */}
                            {song ? (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayFriendSong(song);
                                    }}
                                    className="p-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl flex items-center justify-between gap-2.5 transition-all group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                            <img
                                                src={song.artworkUrl || '/vibeon-logo.png'}
                                                alt={song.title}
                                                className="w-full h-full object-cover"
                                            />
                                            {isActivelyPlaying && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <div className="flex items-end gap-0.5 h-3">
                                                        <div className="w-0.5 bg-primary animate-bounce h-2" />
                                                        <div className="w-0.5 bg-primary animate-bounce h-3 delay-100" />
                                                        <div className="w-0.5 bg-primary animate-bounce h-1.5 delay-200" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                                                {song.title}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">{song.artist}</p>
                                        </div>
                                    </div>

                                    {/* Quick Play Action Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlayFriendSong(song);
                                        }}
                                        className="p-2 bg-primary/20 group-hover:bg-primary text-primary group-hover:text-white rounded-xl transition-all active:scale-95 shrink-0"
                                        title={`Play ${song.title}`}
                                        aria-label={`Play ${song.title}`}
                                    >
                                        <IoPlay size={14} className="translate-x-0.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="p-2 bg-white/5 rounded-xl text-[10px] text-gray-500 italic">
                                    Not listening to anything right now
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
