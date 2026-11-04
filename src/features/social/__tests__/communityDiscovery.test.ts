import { describe, it, expect, beforeEach } from 'vitest';
import communityReducer, {
    setCommunityPosts,
    addCommunityPost,
    removeCommunityPost,
    toggleLikePost,
    votePollOption,
    setActiveFilter,
    setPostComments,
    addPostComment,
    addFollow,
    removeFollow,
    CommunityPost
} from '../communitySlice';

describe('Sprint 4.3 Community Music Discovery Redux Engine Tests', () => {
    let initialState: any;

    beforeEach(() => {
        initialState = {
            posts: [],
            activeFilter: 'all',
            isLoading: false,
            isPosting: false,
            error: null,
            activePostComments: {},
            commentsLoading: {},
            followingUserIds: [],
        };
    });

    it('should set and filter community posts', () => {
        const posts: CommunityPost[] = [
            {
                id: 'post_1',
                authorId: 'u1',
                authorName: 'Alex',
                postType: 'song',
                caption: 'Check this track out!',
                musicData: { id: 's1', name: 'Song 1' },
                tags: ['rock'],
                likesCount: 5,
                commentsCount: 2,
                isLiked: false,
                createdAt: new Date().toISOString()
            },
            {
                id: 'post_2',
                authorId: 'u2',
                authorName: 'Priya',
                postType: 'poll',
                caption: 'Favorite genre?',
                pollData: {
                    question: 'What do you listen to while coding?',
                    options: [
                        { id: '1', text: 'Lo-Fi', votes: 10 },
                        { id: '2', text: 'Synthwave', votes: 15 }
                    ],
                    totalVotes: 25
                },
                tags: ['poll'],
                likesCount: 8,
                commentsCount: 4,
                isLiked: true,
                createdAt: new Date().toISOString()
            }
        ];

        let state = communityReducer(initialState, setCommunityPosts(posts));
        expect(state.posts.length).toBe(2);

        state = communityReducer(state, setActiveFilter('polls'));
        expect(state.activeFilter).toBe('polls');
    });

    it('should toggle like on community post and adjust counts', () => {
        const posts: CommunityPost[] = [
            {
                id: 'p1',
                authorId: 'u1',
                authorName: 'User',
                postType: 'discussion',
                caption: 'Album discussion',
                tags: [],
                likesCount: 10,
                commentsCount: 0,
                isLiked: false,
                createdAt: new Date().toISOString()
            }
        ];

        let state = communityReducer({ ...initialState, posts }, toggleLikePost({ postId: 'p1', liked: true }));
        expect(state.posts[0].isLiked).toBe(true);
        expect(state.posts[0].likesCount).toBe(11);

        state = communityReducer(state, toggleLikePost({ postId: 'p1', liked: false }));
        expect(state.posts[0].isLiked).toBe(false);
        expect(state.posts[0].likesCount).toBe(10);
    });

    it('should vote in a community poll deterministically', () => {
        const posts: CommunityPost[] = [
            {
                id: 'poll_post',
                authorId: 'u1',
                authorName: 'User',
                postType: 'poll',
                caption: 'Vote now',
                pollData: {
                    question: 'Best Artist?',
                    options: [
                        { id: 'opt_1', text: 'Artist A', votes: 5 },
                        { id: 'opt_2', text: 'Artist B', votes: 3 }
                    ],
                    totalVotes: 8
                },
                tags: [],
                likesCount: 0,
                commentsCount: 0,
                isLiked: false,
                createdAt: new Date().toISOString()
            }
        ];

        let state = communityReducer({ ...initialState, posts }, votePollOption({ postId: 'poll_post', optionId: 'opt_1' }));
        expect(state.posts[0].pollData?.options[0].votes).toBe(6);
        expect(state.posts[0].pollData?.totalVotes).toBe(9);
        expect(state.posts[0].pollData?.userVotedOptionId).toBe('opt_1');

        // Prevent double vote
        state = communityReducer(state, votePollOption({ postId: 'poll_post', optionId: 'opt_2' }));
        expect(state.posts[0].pollData?.options[0].votes).toBe(6);
        expect(state.posts[0].pollData?.options[1].votes).toBe(3);
    });

    it('should manage comments and update comments count on post', () => {
        const posts: CommunityPost[] = [
            {
                id: 'p1',
                authorId: 'u1',
                authorName: 'User',
                postType: 'discussion',
                caption: 'Hello',
                tags: [],
                likesCount: 0,
                commentsCount: 0,
                isLiked: false,
                createdAt: new Date().toISOString()
            }
        ];

        let state = communityReducer({ ...initialState, posts }, setPostComments({
            postId: 'p1',
            comments: [{ id: 'c1', postId: 'p1', authorId: 'u2', authorName: 'Bob', content: 'Great post!', createdAt: new Date().toISOString() }]
        }));
        expect(state.activePostComments['p1'].length).toBe(1);

        state = communityReducer(state, addPostComment({
            id: 'c2',
            postId: 'p1',
            authorId: 'u3',
            authorName: 'Charlie',
            content: 'Agreed!',
            createdAt: new Date().toISOString()
        }));
        expect(state.activePostComments['p1'].length).toBe(2);
        expect(state.posts[0].commentsCount).toBe(1);
    });

    it('should manage follow and unfollow states', () => {
        let state = communityReducer(initialState, addFollow('user_abc'));
        expect(state.followingUserIds).toContain('user_abc');

        state = communityReducer(state, addFollow('user_xyz'));
        expect(state.followingUserIds.length).toBe(2);

        state = communityReducer(state, removeFollow('user_abc'));
        expect(state.followingUserIds).not.toContain('user_abc');
        expect(state.followingUserIds).toContain('user_xyz');
    });

    it('should evaluate deterministic engagement scoring formula correctly', () => {
        const computeScore = (likes: number, comments: number, hoursOld: number) => {
            return (likes * 2 + comments * 3) / Math.pow(hoursOld + 2, 1.5);
        };

        const recentEngaged = computeScore(20, 5, 1);   // (40 + 15) / (3^1.5) = 55 / 5.196 = ~10.58
        const oldLowEngaged = computeScore(20, 5, 24);  // 55 / (26^1.5) = 55 / 132.57 = ~0.41
        expect(recentEngaged).toBeGreaterThan(oldLowEngaged);
    });
});
