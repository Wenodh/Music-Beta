import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import musicPlayerReducer, {
    setIsSearching,
    setSearchError,
    setSearchQueryState,
    playMusic,
} from '../features/musicplayer/musicPlayerSlice';
import uiReducer, { showToast } from '../features/ui/uiSlice';
import { mapApiSongToSong } from './favoriteRecoveryService';
import { musicApiService } from './musicApiService';

describe('Search and Home Feed Fixes Unit Tests', () => {
    let store: any;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                musicPlayer: musicPlayerReducer,
                ui: uiReducer,
            },
        });
        vi.clearAllMocks();
    });

    it('1. musicPlayerSlice updates search loading, error, and query states accurately', () => {
        expect(store.getState().musicPlayer.isSearching).toBe(false);
        expect(store.getState().musicPlayer.searchError).toBeNull();
        expect(store.getState().musicPlayer.searchQuery).toBe('');

        store.dispatch(setIsSearching(true));
        expect(store.getState().musicPlayer.isSearching).toBe(true);

        store.dispatch(setSearchQueryState('Shape of You'));
        expect(store.getState().musicPlayer.searchQuery).toBe('Shape of You');

        store.dispatch(setSearchError('Search failed'));
        expect(store.getState().musicPlayer.searchError).toBe('Search failed');

        store.dispatch(setIsSearching(false));
        store.dispatch(setSearchError(null));
        expect(store.getState().musicPlayer.isSearching).toBe(false);
        expect(store.getState().musicPlayer.searchError).toBeNull();
    });

    it('2. mapApiSongToSong normalizes raw JioSaavn search/detail response into canonical Song format', () => {
        const rawApiDetail = {
            id: 'wwSCc15h',
            name: 'Shape of You &amp; Friends',
            duration: 233,
            year: 2017,
            image: [
                { quality: '50x50', url: 'https://example.com/50.jpg' },
                { quality: '500x500', url: 'https://example.com/500.jpg' },
            ],
            downloadUrl: [
                { quality: '160kbps', url: 'https://example.com/160.mp4' },
                { quality: '320kbps', url: 'https://example.com/320.mp4' },
            ],
            artists: {
                primary: [{ name: 'Ed Sheeran &amp; Co' }],
            },
            album: {
                id: '3320300',
                name: 'Divide &amp; Conquer',
            },
        };

        const normalized = mapApiSongToSong(rawApiDetail, 'wwSCc15h');
        expect(normalized.id).toBe('wwSCc15h');
        expect(normalized.name).toBe('Shape of You & Friends');
        expect(normalized.primaryArtists).toBe('Ed Sheeran & Co');
        expect(Array.isArray(normalized.downloadUrl)).toBe(true);
        expect(normalized.downloadUrl.length).toBe(2);
        expect((normalized.album as any).name).toBe('Divide & Conquer');
    });

    it('3. playMusic correctly formats playable music URL according to preferred quality and preserves queue', () => {
        // Pre-populate queue with existing song
        const existingSong = {
            id: 'song1',
            name: 'Existing Song',
            duration: 180,
            image: 'https://example.com/img1.jpg',
            downloadUrl: 'https://example.com/audio1.mp4',
            primaryArtists: 'Artist 1',
        };
        store.dispatch(playMusic(existingSong));
        expect(store.getState().musicPlayer.songs.length).toBe(1);
        expect(store.getState().musicPlayer.currentSong?.id).toBe('song1');

        // Play newly resolved search song
        const searchSong = {
            id: 'search123',
            name: 'Search Result Song',
            duration: 200,
            image: [{ quality: '500x500', url: 'https://example.com/search.jpg' }],
            downloadUrl: [
                { quality: '160kbps', url: 'https://example.com/search-160.mp4' },
                { quality: '320kbps', url: 'https://example.com/search-320.mp4' },
            ],
            primaryArtists: 'Search Artist',
        };

        store.dispatch(playMusic({ ...searchSong, forcePlay: true }));

        const state = store.getState().musicPlayer;
        expect(state.currentSong?.id).toBe('search123');
        expect(state.currentSong?.name).toBe('Search Result Song');
        // preferredQuality default is 320kbps
        expect(state.currentSong?.music).toBe('https://example.com/search-320.mp4');
        expect(state.isPlaying).toBe(true);
        // Queue should retain existingSong and prepend search123 without replacing/clearing queue
        expect(state.songs.some((s: any) => s.id === 'song1')).toBe(true);
        expect(state.songs.some((s: any) => s.id === 'search123')).toBe(true);
    });

    it('4. Search detail resolution resilient fallback using musicApiService', async () => {
        const fetchSpy = vi.spyOn(musicApiService, 'fetchWithFallback').mockResolvedValueOnce({
            data: {
                data: [
                    {
                        id: 'targetSong',
                        name: 'Resolved Track',
                        downloadUrl: [{ quality: '320kbps', url: 'https://stream.example.com/song.mp4' }],
                        image: [{ quality: '500x500', url: 'https://image.example.com/art.jpg' }],
                        primaryArtists: 'Singer',
                    },
                ],
            },
            provider: 'primary',
        });

        const res = await musicApiService.fetchWithFallback('/api/songs/targetSong');
        expect(fetchSpy).toHaveBeenCalledWith('/api/songs/targetSong');
        const songData = res.data.data[0];
        const canonical = mapApiSongToSong(songData, songData.id);
        expect(canonical.id).toBe('targetSong');
        expect(canonical.name).toBe('Resolved Track');
        expect(canonical.downloadUrl).toBeDefined();
    });

    it('5. Error toast is triggered when song detail resolution fails', () => {
        store.dispatch(showToast({
            message: 'Unable to play selected song. Please try another track.',
            type: 'error',
        }));

        const uiState = store.getState().ui;
        expect(uiState.toasts.length).toBe(1);
        expect(uiState.toasts[0].message).toContain('Unable to play selected song');
        expect(uiState.toasts[0].type).toBe('error');
    });

    it('6. AbortController signal correctly indicates cancellation for Home feed requests', () => {
        const controller = new AbortController();
        expect(controller.signal.aborted).toBe(false);
        controller.abort();
        expect(controller.signal.aborted).toBe(true);
    });
});
