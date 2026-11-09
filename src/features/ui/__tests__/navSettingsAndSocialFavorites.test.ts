import { describe, it, expect } from 'vitest';
import uiReducer, { setIsNavSettingsViewing } from '../uiSlice';
import socialReducer, { setSocialActiveTab } from '../../social/socialSlice';
import libraryReducer, { toggleFavorite, setFavorites } from '../../library/librarySlice';
import { Song } from '../../../types/music';

describe('Nav Settings Visibility, Chat/Call Navigation & Favorites Recency Tests', () => {
    describe('1. Navigation Settings Bar Visibility', () => {
        it('initializes isNavSettingsViewing as false', () => {
            const state = uiReducer(undefined, { type: '@@INIT' });
            expect(state.isNavSettingsViewing).toBe(false);
        });

        it('toggles isNavSettingsViewing state accurately', () => {
            let state = uiReducer(undefined, { type: '@@INIT' });
            state = uiReducer(state, setIsNavSettingsViewing(true));
            expect(state.isNavSettingsViewing).toBe(true);

            state = uiReducer(state, setIsNavSettingsViewing(false));
            expect(state.isNavSettingsViewing).toBe(false);
        });
    });

    describe('2. Social Active Tab Navigation for Logged-In Users', () => {
        it('initializes socialActiveTab with chats default', () => {
            const state = socialReducer(undefined, { type: '@@INIT' });
            expect(state.socialActiveTab).toBe('chats');
        });

        it('updates socialActiveTab when switching between chats and calls', () => {
            let state = socialReducer(undefined, { type: '@@INIT' });
            state = socialReducer(state, setSocialActiveTab('calls'));
            expect(state.socialActiveTab).toBe('calls');

            state = socialReducer(state, setSocialActiveTab('chats'));
            expect(state.socialActiveTab).toBe('chats');
        });
    });

    describe('3. Favorites Recency & Ordering', () => {
        const dummySong1: Song = {
            id: 'song-1',
            name: 'First Favorited Song',
            duration: 180,
            image: '/cover1.jpg',
            downloadUrl: '/stream1.mp3',
            primaryArtists: 'Artist A',
        };

        const dummySong2: Song = {
            id: 'song-2',
            name: 'Second Favorited Song',
            duration: 200,
            image: '/cover2.jpg',
            downloadUrl: '/stream2.mp3',
            primaryArtists: 'Artist B',
        };

        it('prepends latest added favorite song to the top of the favorites list', () => {
            let state = libraryReducer(undefined, { type: '@@INIT' });
            expect(state.favorites).toEqual([]);

            // Add first song
            state = libraryReducer(state, toggleFavorite(dummySong1));
            expect(state.favorites).toHaveLength(1);
            expect(state.favorites[0].id).toBe('song-1');

            // Add second song - must appear at index 0 (top)
            state = libraryReducer(state, toggleFavorite(dummySong2));
            expect(state.favorites).toHaveLength(2);
            expect(state.favorites[0].id).toBe('song-2');
            expect(state.favorites[1].id).toBe('song-1');
            expect(state.favorites[0].addedAt).toBeDefined();
        });

        it('removes song properly when toggled again without breaking other items', () => {
            let state = libraryReducer(undefined, { type: '@@INIT' });
            state = libraryReducer(state, toggleFavorite(dummySong1));
            state = libraryReducer(state, toggleFavorite(dummySong2));

            // Untoggle song-2 (remove it)
            state = libraryReducer(state, toggleFavorite(dummySong2));
            expect(state.favorites).toHaveLength(1);
            expect(state.favorites[0].id).toBe('song-1');
        });

        it('handles rapid toggle/untoggle cycles cleanly', () => {
            let state = libraryReducer(undefined, { type: '@@INIT' });
            // Add song 1
            state = libraryReducer(state, toggleFavorite(dummySong1));
            // Toggle song 1 off
            state = libraryReducer(state, toggleFavorite(dummySong1));
            expect(state.favorites).toHaveLength(0);
            // Toggle song 1 on again
            state = libraryReducer(state, toggleFavorite(dummySong1));
            expect(state.favorites).toHaveLength(1);
            expect(state.favorites[0].id).toBe('song-1');
        });

        it('correctly sorts favorites by date descending when addedAt is populated', () => {
            const timePast = Date.now() - 10000;
            const timeRecent = Date.now();

            const favList: Song[] = [
                { ...dummySong1, addedAt: timePast },
                { ...dummySong2, addedAt: timeRecent },
            ];

            const sorted = [...favList].sort((a, b) => {
                const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
                const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
                if (timeA && timeB) return timeB - timeA;
                return 0;
            });

            expect(sorted[0].id).toBe('song-2');
            expect(sorted[1].id).toBe('song-1');
        });
    });
});
