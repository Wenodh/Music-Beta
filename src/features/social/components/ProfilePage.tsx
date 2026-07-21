import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useAppSelector, useAppDispatch } from '../../../hooks/redux';
import { motion } from 'framer-motion';
import { IoSettingsOutline, IoShareOutline, IoPersonAddOutline, IoCheckmarkCircle, IoPeopleOutline, IoTimeOutline, IoSparklesOutline, IoFlameOutline, IoHeartOutline, IoLibraryOutline, IoStatsChartOutline } from 'react-icons/io5';
import { setSessionModalOpen } from '../../ui/uiSlice';

const ProfilePage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { userId } = useParams<{ userId: string }>();
    const { profile, followers, following, isFollowing, loading, follow, unfollow, refresh } = useProfile(userId);
    const currentUser = useAppSelector(state => state.auth.user);
    const isOwnProfile = currentUser?.id === userId || !userId;

    useEffect(() => {
        refresh();
    }, [userId]);

    if (loading && !profile) {
        return (
            <div className="max-w-4xl mx-auto p-4 animate-pulse">
                <div className="h-48 bg-white/5 rounded-3xl mb-8" />
                <div className="flex gap-4 mb-8">
                    <div className="w-24 h-24 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-4 py-2">
                        <div className="h-4 bg-white/5 w-1/3 rounded" />
                        <div className="h-3 bg-white/5 w-1/4 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Profile not found</h2>
                <p className="text-secondary mt-2">The user you're looking for doesn't exist or is private.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header / Cover */}
            <div className="relative h-48 sm:h-64 rounded-b-[3rem] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                <div className="absolute inset-0 backdrop-blur-3xl opacity-30" />
            </div>

            {/* Profile Info */}
            <div className="px-4 -mt-12 sm:-mt-16 relative z-10">
                <div className="flex flex-col sm:flex-row items-end gap-4 sm:gap-6 mb-8">
                    <img
                        src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-950 bg-gray-200 dark:bg-gray-800 object-cover"
                        alt={profile.displayName}
                    />
                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black">{profile.displayName}</h1>
                            {profile.isVerified && <IoCheckmarkCircle className="text-primary" size={20} />}
                        </div>
                        <p className="text-secondary">@{profile.username}</p>
                    </div>
                    <div className="flex gap-2 mb-2">
                        {isOwnProfile ? (
                            <button className="p-3 rounded-full bg-secondary/10 hover:bg-secondary/20 transition-colors">
                                <IoSettingsOutline size={20} />
                            </button>
                        ) : (
                            <>
                                <button className="p-3 rounded-full bg-secondary/10 hover:bg-secondary/20 transition-colors">
                                    <IoShareOutline size={20} />
                                </button>
                                <button
                                    onClick={isFollowing ? unfollow : follow}
                                    className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all active:scale-95 ${isFollowing ? 'bg-secondary/10 hover:bg-secondary/20' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}
                                >
                                    {!isFollowing && <IoPersonAddOutline size={18} />}
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-8 mb-8 border-y border-secondary/10 py-4 overflow-x-auto no-scrollbar">
                    <div className="text-center">
                        <div className="text-xl font-black">{following.length}</div>
                        <div className="text-[10px] uppercase tracking-widest text-secondary font-bold">Following</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-black">{followers.length}</div>
                        <div className="text-[10px] uppercase tracking-widest text-secondary font-bold">Followers</div>
                    </div>
                    {profile.listeningStats?.topGenres && (
                        <div className="text-center">
                            <div className="text-xl font-black">{profile.listeningStats.topGenres.length}</div>
                            <div className="text-[10px] uppercase tracking-widest text-secondary font-bold">Genres</div>
                        </div>
                    )}
                </div>

                {/* Bio */}
                {profile.bio && (
                    <div className="mb-8">
                        <h2 className="text-xs uppercase tracking-[0.2em] font-black text-secondary mb-2">About</h2>
                        <p className="text-sm leading-relaxed opacity-80">{profile.bio}</p>
                    </div>
                )}

                {/* Favorite Genres */}
                {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xs uppercase tracking-[0.2em] font-black text-secondary mb-4">Vibe</h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.favoriteGenres.map(genre => (
                                <span key={genre} className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold text-primary">
                                    {genre}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Listening Insights */}
                {profile.listeningStats && (
                    <div className="mb-12">
                        <h2 className="text-xs uppercase tracking-[0.2em] font-black text-secondary mb-6 flex items-center gap-2">
                            <IoStatsChartOutline className="text-primary" /> Listening Insights
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InsightCard
                                label="Listening Time"
                                value={`${profile.listeningStats.totalHours || 0} hrs`}
                                icon={<IoTimeOutline />}
                                color="bg-blue-500/10 text-blue-500"
                            />
                            <InsightCard
                                label="Top Genre"
                                value={profile.listeningStats.topGenre || 'None'}
                                icon={<IoSparklesOutline />}
                                color="bg-purple-500/10 text-purple-500"
                            />
                            <InsightCard
                                label="Daily Streak"
                                value={`${profile.listeningStats.streakDays || 0} days`}
                                icon={<IoFlameOutline />}
                                color="bg-orange-500/10 text-orange-500"
                            />
                            <InsightCard
                                label="Completion"
                                value={`${profile.listeningStats.completionRate || 0}%`}
                                icon={<IoHeartOutline />}
                                color="bg-red-500/10 text-red-500"
                            />
                        </div>
                    </div>
                )}

                {/* Group Session Card (Only for own profile) */}
                {isOwnProfile && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        onClick={() => dispatch(setSessionModalOpen(true))}
                        className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-transparent border border-primary/20 rounded-[2rem] relative overflow-hidden group cursor-pointer mb-12"
                    >
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
                                    <IoPeopleOutline className="text-primary" /> Group Session
                                </h2>
                                <p className="text-sm opacity-60 max-w-md">
                                    Listen together with your friends in real-time. Start a session or join one using a room code.
                                </p>
                            </div>
                            <button className="bg-primary text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95">
                                Open Group
                            </button>
                        </div>
                        <IoPeopleOutline className="absolute -right-8 -bottom-8 text-9xl text-primary/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </motion.div>
                )}

                {/* Suggestions / Discover */}
                <div className="mb-12">
                    <h2 className="text-xs uppercase tracking-[0.2em] font-black text-secondary mb-6 flex items-center gap-2">
                        <IoSparklesOutline className="text-primary" /> Discover People
                    </h2>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex-shrink-0 w-40 bg-secondary/5 rounded-3xl p-5 border border-secondary/5 flex flex-col items-center text-center">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=suggested${i}`} className="w-16 h-16 rounded-full mb-3 bg-secondary/10" alt="" />
                                <p className="font-bold text-sm truncate w-full">Vibe Explorer</p>
                                <p className="text-[10px] text-secondary mb-3">80% Match</p>
                                <button className="w-full py-2 bg-primary text-white text-[10px] font-black uppercase rounded-xl">Follow</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Playlists Section */}
                <div className="mb-20">
                    <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                        Public Playlists
                        <span className="text-xs font-normal text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">0</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {/* Placeholder for playlists */}
                        <div className="aspect-square rounded-3xl bg-secondary/5 flex items-center justify-center border-2 border-dashed border-secondary/10 hover:border-primary/20 transition-colors cursor-pointer group">
                            <div className="text-center p-6">
                                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <IoLibraryOutline className="text-secondary" size={24} />
                                </div>
                                <p className="text-xs text-secondary font-bold uppercase tracking-wider">No public playlists</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InsightCard = ({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) => (
    <div className="bg-secondary/5 p-5 rounded-3xl flex flex-col items-center text-center gap-3 border border-secondary/5 hover:border-primary/10 transition-colors">
        <div className={`text-2xl p-3 rounded-2xl ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-secondary mb-0.5">{label}</p>
            <p className="text-xl font-black">{value}</p>
        </div>
    </div>
);

export default ProfilePage;
