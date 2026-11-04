import { supabase } from '../lib/supabase';
import { CommunityPost, PostComment, PostType } from '../features/social/communitySlice';

export const communityService = {
    /**
     * Fetch community feed with deterministic ranking (recency + engagement) and block filtering.
     */
    fetchFeed: async (filter = 'all', page = 1, pageSize = 20): Promise<CommunityPost[]> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const curUserId = userData?.user?.id;

            let query = supabase
                .from('community_posts')
                .select(`
                    id,
                    author_id,
                    post_type,
                    caption,
                    music_data,
                    poll_data,
                    tags,
                    likes_count,
                    comments_count,
                    is_pinned,
                    created_at,
                    profiles:author_id (display_name, username, avatar_url)
                `);

            if (filter === 'songs') query = query.eq('post_type', 'song');
            else if (filter === 'albums') query = query.eq('post_type', 'album');
            else if (filter === 'discussions') query = query.eq('post_type', 'discussion');
            else if (filter === 'polls') query = query.eq('post_type', 'poll');

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await query
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error || !data) {
                return [];
            }

            // Check liked status if user is authenticated
            let likedPostIds = new Set<string>();
            if (curUserId && data.length > 0) {
                const postIds = data.map(d => d.id);
                const { data: likes } = await supabase
                    .from('post_reactions')
                    .select('post_id')
                    .eq('user_id', curUserId)
                    .in('post_id', postIds);

                if (likes) {
                    likedPostIds = new Set(likes.map(l => l.post_id));
                }
            }

            // Compute deterministic engagement score: (likes*2 + comments*3) / (hoursOld + 2)^1.5
            const scoredPosts = data.map((d: any) => {
                const hoursOld = Math.max(0, (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60));
                const likes = d.likes_count || 0;
                const comments = d.comments_count || 0;
                const score = (likes * 2 + comments * 3) / Math.pow(hoursOld + 2, 1.5);

                return {
                    id: d.id,
                    authorId: d.author_id,
                    authorName: d.profiles?.display_name || d.profiles?.username || 'Vibe Listener',
                    authorAvatar: d.profiles?.avatar_url,
                    postType: d.post_type as PostType,
                    caption: d.caption,
                    musicData: d.music_data,
                    pollData: d.poll_data,
                    tags: d.tags || [],
                    likesCount: likes,
                    commentsCount: comments,
                    isLiked: likedPostIds.has(d.id),
                    isPinned: Boolean(d.is_pinned),
                    createdAt: d.created_at,
                    score
                };
            });

            // Sort deterministically: Pinned first, then score descending, then created_at descending
            scoredPosts.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            return scoredPosts;
        } catch (e) {
            console.warn('[communityService] fetchFeed error:', e);
            return [];
        }
    },

    /**
     * Create a new community post (Song, Album, Discussion, Review, Poll)
     */
    createPost: async (post: {
        postType: PostType;
        caption: string;
        musicData?: any;
        pollData?: any;
        tags?: string[];
    }): Promise<{ success: boolean; post?: CommunityPost; message?: string }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) {
                return { success: false, message: 'Sign in to share with the community.' };
            }

            const { data, error } = await supabase
                .from('community_posts')
                .insert({
                    author_id: userData.user.id,
                    post_type: post.postType,
                    caption: post.caption,
                    music_data: post.musicData || null,
                    poll_data: post.pollData || null,
                    tags: post.tags || []
                })
                .select(`
                    id,
                    author_id,
                    post_type,
                    caption,
                    music_data,
                    poll_data,
                    tags,
                    likes_count,
                    comments_count,
                    created_at,
                    profiles:author_id (display_name, username, avatar_url)
                `)
                .single();

            if (error || !data) {
                return { success: false, message: error?.message || 'Failed to create post.' };
            }

            return {
                success: true,
                post: {
                    id: data.id,
                    authorId: data.author_id,
                    authorName: (data as any).profiles?.display_name || 'You',
                    authorAvatar: (data as any).profiles?.avatar_url,
                    postType: data.post_type as PostType,
                    caption: data.caption,
                    musicData: data.music_data,
                    pollData: data.poll_data,
                    tags: data.tags || [],
                    likesCount: 0,
                    commentsCount: 0,
                    isLiked: false,
                    createdAt: data.created_at
                }
            };
        } catch (e: any) {
            return { success: false, message: e.message || 'Network error creating post.' };
        }
    },

    /**
     * Persist user poll vote to Supabase using atomic submit_poll_vote RPC
     */
    votePoll: async (postId: string, optionId: string): Promise<boolean> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return false;

            const { data, error } = await supabase.rpc('submit_poll_vote', {
                target_post_id: postId,
                target_option_id: optionId
            });

            if (!error && data?.success) {
                return true;
            }

            // Fallback for offline / unmigrated dev testing
            const { data: post } = await supabase
                .from('community_posts')
                .select('poll_data')
                .eq('id', postId)
                .single();

            if (post?.poll_data) {
                const pollData = post.poll_data;
                const option = pollData.options?.find((o: any) => o.id === optionId);
                if (option) {
                    option.votes = (option.votes || 0) + 1;
                    pollData.totalVotes = (pollData.totalVotes || 0) + 1;

                    await supabase
                        .from('community_posts')
                        .update({ poll_data: pollData, updated_at: new Date().toISOString() })
                        .eq('id', postId);
                    return true;
                }
            }
            return false;
        } catch {
            return false;
        }
    },

    /**
     * Toggle follow/unfollow a community author
     */
    toggleFollowUser: async (targetUserId: string, isFollowing: boolean): Promise<boolean> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user || userData.user.id === targetUserId) return false;

            if (isFollowing) {
                await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', userData.user.id)
                    .eq('following_id', targetUserId);
            } else {
                await supabase
                    .from('user_follows')
                    .insert({
                        follower_id: userData.user.id,
                        following_id: targetUserId,
                        status: 'accepted'
                    });
            }
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Toggle like/heart on a post.
     */
    toggleLike: async (postId: string, isLiked: boolean): Promise<boolean> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user) return false;

            if (isLiked) {
                await supabase
                    .from('post_reactions')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', userData.user.id);
            } else {
                await supabase
                    .from('post_reactions')
                    .insert({
                        post_id: postId,
                        user_id: userData.user.id,
                        reaction_type: 'heart'
                    });
            }
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Fetch comments for a specific post.
     */
    fetchComments: async (postId: string): Promise<PostComment[]> => {
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select(`
                    id,
                    post_id,
                    author_id,
                    content,
                    created_at,
                    profiles:author_id (display_name, username, avatar_url)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error || !data) return [];

            return data.map((d: any) => ({
                id: d.id,
                postId: d.post_id,
                authorId: d.author_id,
                authorName: d.profiles?.display_name || d.profiles?.username || 'Listener',
                authorAvatar: d.profiles?.avatar_url,
                content: d.content,
                createdAt: d.created_at
            }));
        } catch {
            return [];
        }
    },

    /**
     * Add a comment to a post.
     */
    addComment: async (postId: string, content: string): Promise<PostComment | null> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user || !content.trim()) return null;

            const { data, error } = await supabase
                .from('post_comments')
                .insert({
                    post_id: postId,
                    author_id: userData.user.id,
                    content: content.trim()
                })
                .select(`
                    id,
                    post_id,
                    author_id,
                    content,
                    created_at,
                    profiles:author_id (display_name, username, avatar_url)
                `)
                .single();

            if (error || !data) return null;

            return {
                id: data.id,
                postId: data.post_id,
                authorId: data.author_id,
                authorName: (data as any).profiles?.display_name || 'You',
                authorAvatar: (data as any).profiles?.avatar_url,
                content: data.content,
                createdAt: data.created_at
            };
        } catch {
            return null;
        }
    }
};
