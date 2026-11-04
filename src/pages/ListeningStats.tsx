import React, { useState, useMemo } from 'react';
import { useAppSelector } from '../hooks/redux';
import { calculateListeningStats, ListeningSessionEvent, AnalyticsTimeRange } from '../services/analyticsService';
import { IoTimeOutline, IoMusicalNotesOutline, IoFlameOutline, IoArrowBack } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const ListeningStats: React.FC = () => {
    const navigate = useNavigate();
    const { recentlyPlayed } = useAppSelector(state => state.musicPlayer);
    const { favorites } = useAppSelector(state => state.library);
    const [range, setRange] = useState<AnalyticsTimeRange>('30d');

    // Synthesize local events from recentlyPlayed & local activity
    const events: ListeningSessionEvent[] = useMemo(() => {
        const now = Date.now();
        return recentlyPlayed.map((song, i) => ({
            id: `event-${song.id}-${i}`,
            songId: song.id,
            songName: song.name,
            artistName: song.primaryArtists,
            imageUrl: Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image,
            durationPlayedSeconds: Number(song.duration) || 180,
            completionPercentage: 100,
            playbackSpeed: 1.0,
            timestamp: now - i * 3 * 60 * 60 * 1000, // Staggered over recent hours/days
        }));
    }, [recentlyPlayed]);

    const stats = useMemo(() => {
        return calculateListeningStats(events, range);
    }, [events, range]);

    const formatDuration = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white p-4 md:p-8 pb-32">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-gray-200 dark:bg-white/10 rounded-full hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                    >
                        <IoArrowBack size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black">Listening Insights</h1>
                        <p className="text-xs md:text-sm text-gray-500">Your personal listening activity and stats</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-8 bg-gray-200 dark:bg-white/5 p-1 rounded-2xl w-fit">
                    {(['7d', '30d', '90d', 'all'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setRange(tab)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                range === tab
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {tab === '7d' ? 'Last 7 Days' : tab === '30d' ? 'Last 30 Days' : tab === '90d' ? 'Last 90 Days' : 'All Time'}
                        </button>
                    ))}
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-primary text-sm font-bold mb-2">
                            <IoTimeOutline size={18} />
                            <span>Listening Time</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black">{formatDuration(stats.totalListeningTimeSeconds)}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Factoring in playback speed</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-cyan-500 text-sm font-bold mb-2">
                            <IoMusicalNotesOutline size={18} />
                            <span>Songs Played</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black">{stats.totalTracksPlayed}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Across selected range</p>
                    </div>

                    <div className="col-span-2 md:col-span-1 p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-rose-500 text-sm font-bold mb-2">
                            <IoFlameOutline size={18} />
                            <span>Library Favorites</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-black">{favorites.length}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Liked tracks</p>
                    </div>
                </div>

                {/* Top Artists & Tracks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Top Songs */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10">
                        <h2 className="text-lg font-bold mb-4">Top Tracks</h2>
                        {stats.topTracks.length === 0 ? (
                            <p className="text-xs text-gray-400">No tracks played in this period.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.topTracks.slice(0, 5).map((track, idx) => (
                                    <div key={track.songId} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                                        {track.image && (
                                            <img src={track.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{track.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-primary">{track.count} plays</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top Artists */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10">
                        <h2 className="text-lg font-bold mb-4">Top Artists</h2>
                        {stats.topArtists.length === 0 ? (
                            <p className="text-xs text-gray-400">No artist data for this period.</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.topArtists.slice(0, 5).map((artist, idx) => (
                                    <div key={artist.artist} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                                            <span className="text-xs font-bold capitalize">{artist.artist}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500">{artist.count} plays</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListeningStats;
