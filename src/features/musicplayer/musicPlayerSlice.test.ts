import { describe, it, expect } from 'vitest';
import reducer, { addRecentSearch, playMusic } from './musicPlayerSlice';
import { MusicPlayerState } from '../../types/music';

describe('musicPlayerSlice defensive checks', () => {
    it('should handle undefined recentSearches in addRecentSearch', () => {
        const initialState = {
            recentSearches: undefined as any
        } as MusicPlayerState;

        const action = addRecentSearch('test query');
        const nextState = reducer(initialState, action);

        expect(nextState.recentSearches).toEqual(['test query']);
    });

    it('should handle undefined recentlyPlayed in playMusic', () => {
        const initialState = {
            recentlyPlayed: undefined as any,
            songs: [],
            preferredQuality: '320kbps'
        } as unknown as MusicPlayerState;

        const song = { id: '1', name: 'Test Song', music: 'url' };
        const action = playMusic(song);
        const nextState = reducer(initialState, action);

        expect(nextState.recentlyPlayed).toBeDefined();
        expect(nextState.recentlyPlayed.length).toBe(1);
        expect(nextState.recentlyPlayed[0].id).toBe('1');
    });

    it('should handle undefined songs in playMusic', () => {
        const initialState = {
            recentlyPlayed: [],
            songs: undefined as any,
            preferredQuality: '320kbps'
        } as unknown as MusicPlayerState;

        const song = { id: '1', name: 'Test Song', music: 'url' };
        const action = playMusic(song);
        const nextState = reducer(initialState, action);

        expect(nextState.songs).toBeDefined();
        expect(nextState.songs.length).toBe(1);
        expect(nextState.songs[0].id).toBe('1');
    });
});
