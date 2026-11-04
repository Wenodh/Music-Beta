import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PostType = 'song' | 'album' | 'playlist' | 'discussion' | 'review' | 'poll';

export interface CommunityPost {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    postType: PostType;
    caption: string;
    musicData?: any;
    pollData?: {
        question: string;
        options: { id: string; text: string; votes: number }[];
        totalVotes: number;
        userVotedOptionId?: string;
        expiresAt?: string;
    };
    tags: string[];
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    isPinned?: boolean;
    createdAt: string;
}

export interface PostComment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
}

interface CommunityState {
    posts: CommunityPost[];
    activeFilter: 'all' | 'songs' | 'albums' | 'discussions' | 'polls' | 'friends';
    isLoading: boolean;
    isPosting: boolean;
    error: string | null;
    activePostComments: Record<string, PostComment[]>;
    commentsLoading: Record<string, boolean>;
    followingUserIds: string[];
}

const initialState: CommunityState = {
    posts: [],
    activeFilter: 'all',
    isLoading: false,
    isPosting: false,
    error: null,
    activePostComments: {},
    commentsLoading: {},
    followingUserIds: [],
};

const communitySlice = createSlice({
    name: 'community',
    initialState,
    reducers: {
        setCommunityPosts: (state, action: PayloadAction<CommunityPost[]>) => {
            state.posts = action.payload;
            state.isLoading = false;
        },
        addCommunityPost: (state, action: PayloadAction<CommunityPost>) => {
            state.posts.unshift(action.payload);
            state.isPosting = false;
        },
        removeCommunityPost: (state, action: PayloadAction<string>) => {
            state.posts = state.posts.filter(p => p.id !== action.payload);
        },
        toggleLikePost: (state, action: PayloadAction<{ postId: string; liked: boolean }>) => {
            const post = state.posts.find(p => p.id === action.payload.postId);
            if (post) {
                post.isLiked = action.payload.liked;
                post.likesCount = action.payload.liked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1);
            }
        },
        votePollOption: (state, action: PayloadAction<{ postId: string; optionId: string }>) => {
            const post = state.posts.find(p => p.id === action.payload.postId);
            if (post && post.pollData && !post.pollData.userVotedOptionId) {
                const opt = post.pollData.options.find(o => o.id === action.payload.optionId);
                if (opt) {
                    opt.votes += 1;
                    post.pollData.totalVotes += 1;
                    post.pollData.userVotedOptionId = action.payload.optionId;
                }
            }
        },
        setActiveFilter: (state, action: PayloadAction<CommunityState['activeFilter']>) => {
            state.activeFilter = action.payload;
        },
        setPostComments: (state, action: PayloadAction<{ postId: string; comments: PostComment[] }>) => {
            state.activePostComments[action.payload.postId] = action.payload.comments;
            state.commentsLoading[action.payload.postId] = false;
        },
        addPostComment: (state, action: PayloadAction<PostComment>) => {
            if (!state.activePostComments[action.payload.postId]) {
                state.activePostComments[action.payload.postId] = [];
            }
            state.activePostComments[action.payload.postId].push(action.payload);
            const post = state.posts.find(p => p.id === action.payload.postId);
            if (post) {
                post.commentsCount += 1;
            }
        },
        setFollowingUserIds: (state, action: PayloadAction<string[]>) => {
            state.followingUserIds = action.payload;
        },
        addFollow: (state, action: PayloadAction<string>) => {
            if (!state.followingUserIds.includes(action.payload)) {
                state.followingUserIds.push(action.payload);
            }
        },
        removeFollow: (state, action: PayloadAction<string>) => {
            state.followingUserIds = state.followingUserIds.filter(id => id !== action.payload);
        },
        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setIsPosting: (state, action: PayloadAction<boolean>) => {
            state.isPosting = action.payload;
        },
        setCommunityError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
            state.isPosting = false;
        },
    },
});

export const {
    setCommunityPosts,
    addCommunityPost,
    removeCommunityPost,
    toggleLikePost,
    votePollOption,
    setActiveFilter,
    setPostComments,
    addPostComment,
    setFollowingUserIds,
    addFollow,
    removeFollow,
    setIsLoading,
    setIsPosting,
    setCommunityError,
} = communitySlice.actions;

export default communitySlice.reducer;
