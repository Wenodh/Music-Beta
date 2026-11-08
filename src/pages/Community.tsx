import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoMusicalNotesOutline, IoChatbubbleEllipsesOutline, IoHeart, IoHeartOutline,
    IoShareSocialOutline, IoPlay, IoAddCircleOutline,
    IoCompassOutline, IoSend, IoClose, IoPersonAddOutline, IoCheckmarkCircleOutline
} from 'react-icons/io5';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { communityService } from '../services/communityService';
import {
    setCommunityPosts, addCommunityPost, toggleLikePost, votePollOption,
    setActiveFilter, setPostComments, addPostComment, addFollow, removeFollow, setIsLoading
} from '../features/social/communitySlice';
import { playMusic, addToQueue } from '../features/musicplayer/musicPlayerSlice';
import { showToast } from '../features/ui/uiSlice';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { useBackHandler } from '../hooks/useBackHandler';
import { backNavigationService } from '../services/backNavigationService';

const Community: React.FC = () => {
    const dispatch = useAppDispatch();
    const { posts, activeFilter, isLoading, activePostComments, followingUserIds } = useAppSelector(state => state.community);
    const { currentSong } = useAppSelector(state => state.musicPlayer);
    const { user } = useAppSelector(state => state.auth);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newPostType, setNewPostType] = useState<'discussion' | 'song' | 'poll'>('discussion');
    const [captionText, setCaptionText] = useState('');
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOption1, setPollOption1] = useState('');
    const [pollOption2, setPollOption2] = useState('');
    const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
    const [newCommentText, setNewCommentText] = useState('');
    const [authPromptOpen, setAuthPromptOpen] = useState(false);

    // Register Community modals with BackNavigationManager (with unsaved changes check)
    useBackHandler(isCreateOpen, {
        id: 'community-create-post-modal',
        priority: backNavigationService.PRIORITY.MODAL_DIALOG,
        onBack: () => {
            const hasDraft = captionText.trim() || pollQuestion.trim() || pollOption1.trim() || pollOption2.trim();
            if (hasDraft) {
                const confirmed = window.confirm('You have unsaved changes in your post. Discard draft?');
                if (!confirmed) {
                    return false; // prevent closing
                }
            }
            setIsCreateOpen(false);
        },
    });

    useBackHandler(authPromptOpen, {
        id: 'community-auth-prompt-modal',
        priority: backNavigationService.PRIORITY.MODAL_DIALOG + 10,
        onBack: () => setAuthPromptOpen(false),
    });

    useEffect(() => {
        dispatch(setIsLoading(true));
        communityService.fetchFeed(activeFilter).then(res => {
            dispatch(setCommunityPosts(res));
        });
    }, [dispatch, activeFilter]);

    const handlePlaySharedSong = (songData: any) => {
        if (!songData) return;
        dispatch(playMusic({ ...songData, forcePlay: true }));
        dispatch(showToast({ message: `Playing ${songData.name || 'Song'}` }));
    };

    const handleQueueSharedSong = (songData: any) => {
        if (!songData) return;
        dispatch(addToQueue(songData));
        dispatch(showToast({ message: `Added to queue` }));
    };

    const handleToggleLike = async (postId: string, currentLiked: boolean) => {
        if (!user) {
            setAuthPromptOpen(true);
            return;
        }
        dispatch(toggleLikePost({ postId, liked: !currentLiked }));
        await communityService.toggleLike(postId, currentLiked);
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setAuthPromptOpen(true);
            return;
        }

        let postPayload: any = {
            postType: newPostType,
            caption: captionText.trim(),
        };

        if (newPostType === 'song' && currentSong) {
            postPayload.musicData = currentSong;
        } else if (newPostType === 'poll') {
            postPayload.pollData = {
                question: pollQuestion.trim() || 'Music Poll',
                options: [
                    { id: '1', text: pollOption1.trim() || 'Option A', votes: 0 },
                    { id: '2', text: pollOption2.trim() || 'Option B', votes: 0 }
                ],
                totalVotes: 0
            };
        }

        const res = await communityService.createPost(postPayload);
        if (res.success && res.post) {
            dispatch(addCommunityPost(res.post));
            dispatch(showToast({ message: 'Posted to community!' }));
            setIsCreateOpen(false);
            setCaptionText('');
            setPollQuestion('');
            setPollOption1('');
            setPollOption2('');
        } else {
            dispatch(showToast({ message: res.message || 'Failed to post', type: 'error' }));
        }
    };

    const handleLoadComments = async (postId: string) => {
        if (expandedCommentsPostId === postId) {
            setExpandedCommentsPostId(null);
            return;
        }
        setExpandedCommentsPostId(postId);
        const comments = await communityService.fetchComments(postId);
        dispatch(setPostComments({ postId, comments }));
    };

    const handleSendComment = async (postId: string) => {
        if (!user) {
            setAuthPromptOpen(true);
            return;
        }
        if (!newCommentText.trim()) return;

        const comment = await communityService.addComment(postId, newCommentText.trim());
        if (comment) {
            dispatch(addPostComment(comment));
            setNewCommentText('');
        }
    };

    return (
        <div className="min-h-screen pb-32 pt-20 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
            {/* Header & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <IoCompassOutline className="text-primary" /> Community Pulse
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Discover genuine tracks, reviews, discussions, and playlists shared by music lovers.
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (!user) setAuthPromptOpen(true);
                        else setIsCreateOpen(true);
                    }}
                    className="px-4 py-2.5 bg-primary hover:bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-primary/20 active:scale-95 transition-all self-start sm:self-auto"
                >
                    <IoAddCircleOutline size={18} /> Share Something
                </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
                {(['all', 'songs', 'albums', 'discussions', 'polls'] as const).map(filter => (
                    <button
                        key={filter}
                        onClick={() => dispatch(setActiveFilter(filter))}
                        className={`px-3.5 py-1.5 rounded-full font-bold capitalize transition-all whitespace-nowrap ${
                            activeFilter === filter
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Posts Stream */}
            <div className="space-y-4">
                {posts.map(post => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-3xl bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm space-y-3.5 backdrop-blur-md"
                    >
                        {/* Author Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary font-bold flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
                                    {post.authorAvatar ? <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" /> : post.authorName[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
                                        {post.authorName}
                                        {user?.id !== post.authorId && (
                                            <button
                                                onClick={async () => {
                                                    if (!user) {
                                                        setAuthPromptOpen(true);
                                                        return;
                                                    }
                                                    const isFollowing = followingUserIds.includes(post.authorId);
                                                    if (isFollowing) {
                                                        dispatch(removeFollow(post.authorId));
                                                    } else {
                                                        dispatch(addFollow(post.authorId));
                                                    }
                                                    await communityService.toggleFollowUser(post.authorId, isFollowing);
                                                }}
                                                className="ml-2 text-[10px] font-bold text-primary hover:underline"
                                            >
                                                {followingUserIds.includes(post.authorId) ? 'Following' : '+ Follow'}
                                            </button>
                                        )}
                                    </h4>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(post.createdAt).toLocaleDateString()} • {post.postType}
                                    </span>
                                </div>
                            </div>

                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {post.postType}
                            </span>
                        </div>

                        {/* Caption Text */}
                        {post.caption && (
                            <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                {post.caption}
                            </p>
                        )}

                        {/* Song / Album Card Attachment */}
                        {post.musicData && (
                            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-inner">
                                <div className="flex items-center gap-3 min-w-0">
                                    {post.musicData.image ? (
                                        <img
                                            src={typeof post.musicData.image === 'string' ? post.musicData.image : post.musicData.image[0]?.url || ''}
                                            alt=""
                                            className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black">
                                            <IoMusicalNotesOutline size={20} />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                            {decodeHtmlEntities(post.musicData.name)}
                                        </h5>
                                        <p className="text-[11px] text-gray-500 truncate">
                                            {decodeHtmlEntities(post.musicData.artist || post.musicData.primaryArtists || 'Artist')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleQueueSharedSong(post.musicData)}
                                        className="p-2 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-white text-xs font-bold transition-all"
                                        title="Queue Track"
                                    >
                                        <IoAddCircleOutline size={18} />
                                    </button>
                                    <button
                                        onClick={() => handlePlaySharedSong(post.musicData)}
                                        className="p-2 rounded-xl bg-primary hover:bg-red-600 text-white shadow-md shadow-primary/20 transition-all active:scale-95"
                                        title="Play Now"
                                    >
                                        <IoPlay size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Interactive Poll Attachment */}
                        {post.pollData && (
                            <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                <h5 className="font-bold text-xs text-gray-900 dark:text-white">
                                    {post.pollData.question}
                                </h5>
                                <div className="space-y-1.5">
                                    {post.pollData.options.map(opt => {
                                        const total = Math.max(1, post.pollData!.totalVotes);
                                        const pct = Math.round((opt.votes / total) * 100);
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={async () => {
                                                    if (!user) {
                                                        setAuthPromptOpen(true);
                                                    } else {
                                                        dispatch(votePollOption({ postId: post.id, optionId: opt.id }));
                                                        await communityService.votePoll(post.id, opt.id);
                                                    }
                                                }}
                                                className="w-full text-left p-2.5 rounded-xl border border-gray-200 dark:border-white/10 relative overflow-hidden flex items-center justify-between text-xs font-semibold"
                                            >
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                                <span className="relative z-10 text-gray-800 dark:text-gray-200">{opt.text}</span>
                                                <span className="relative z-10 font-bold text-primary">{pct}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Engagement Actions (Like, Comment, Share) */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-white/5 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleToggleLike(post.id, post.isLiked)}
                                    className={`flex items-center gap-1 font-bold transition-colors ${
                                        post.isLiked ? 'text-primary' : 'hover:text-primary'
                                    }`}
                                >
                                    {post.isLiked ? <IoHeart size={16} /> : <IoHeartOutline size={16} />}
                                    <span>{post.likesCount}</span>
                                </button>
                                <button
                                    onClick={() => handleLoadComments(post.id)}
                                    className="flex items-center gap-1 font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <IoChatbubbleEllipsesOutline size={16} />
                                    <span>{post.commentsCount}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    dispatch(showToast({ message: 'Post link copied!' }));
                                }}
                                className="hover:text-primary transition-colors"
                                title="Share"
                            >
                                <IoShareSocialOutline size={16} />
                            </button>
                        </div>

                        {/* Comments Drawer */}
                        {expandedCommentsPostId === post.id && (
                            <div className="pt-3 border-t border-gray-200/60 dark:border-white/5 space-y-2.5">
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {(activePostComments[post.id] || []).map(comment => (
                                        <div key={comment.id} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-xs">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-primary">{comment.authorName}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-gray-800 dark:text-gray-200">{comment.content}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                                    />
                                    <button
                                        onClick={() => handleSendComment(post.id)}
                                        className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
                                    >
                                        <IoSend size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Create Post Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
                                <h3 className="font-bold text-base text-gray-900 dark:text-white">Create Community Post</h3>
                                <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white">
                                    <IoClose size={22} />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePost} className="space-y-3.5">
                                <div className="grid grid-cols-3 gap-2">
                                    {(['discussion', 'song', 'poll'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewPostType(type)}
                                            className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                                                newPostType === type
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={captionText}
                                    onChange={(e) => setCaptionText(e.target.value)}
                                    placeholder="What music is on your mind?"
                                    className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-2xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-primary resize-none h-24"
                                    required
                                />

                                {newPostType === 'song' && (
                                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-bold">
                                        🎵 Sharing currently playing: "{currentSong?.name || 'No track playing'}"
                                    </div>
                                )}

                                {newPostType === 'poll' && (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={pollQuestion}
                                            onChange={(e) => setPollQuestion(e.target.value)}
                                            placeholder="Poll Question"
                                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={pollOption1}
                                            onChange={(e) => setPollOption1(e.target.value)}
                                            placeholder="Option 1"
                                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-2 text-xs text-gray-900 dark:text-white"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={pollOption2}
                                            onChange={(e) => setPollOption2(e.target.value)}
                                            placeholder="Option 2"
                                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl p-2 text-xs text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-primary hover:bg-red-600 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-primary/20"
                                >
                                    Publish to Community
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Auth Gate Modal for Guests */}
            <AnimatePresence>
                {authPromptOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 rounded-3xl max-w-xs w-full shadow-2xl text-center space-y-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto">
                                <IoCompassOutline size={26} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Join the Vibe Community</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Sign in to share music, like posts, vote in polls, and connect with other listeners.
                                </p>
                            </div>
                            <button
                                onClick={() => setAuthPromptOpen(false)}
                                className="w-full py-2.5 bg-primary hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Community;
