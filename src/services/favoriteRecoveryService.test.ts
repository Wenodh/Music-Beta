import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isSongIncomplete,
    mapApiSongToSong,
    fetchSongDetailsWithRetry,
    fetchSongByFallbackSearch,
    matchesCandidate,
    getUnsupportedReason,
    repairFavorites,
} from './favoriteRecoveryService';
import { Song } from '../types/music';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        select: vi.fn().mockResolvedValue({ data: [{ song_id: '1' }], error: null }),
                    })),
                })),
            })),
        })),
    },
}));

describe('favoriteRecoveryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isSongIncomplete', () => {
        it('returns true for null/undefined/empty object', () => {
            expect(isSongIncomplete(null)).toBe(true);
            expect(isSongIncomplete(undefined)).toBe(true);
            expect(isSongIncomplete({})).toBe(true);
        });

        it('returns true if song is missing required fields like name, primaryArtists, image, downloadUrl', () => {
            const incompleteSong: Partial<Song> = {
                id: 'YhgzBNHA',
            };
            expect(isSongIncomplete(incompleteSong)).toBe(true);

            const missingImage: Partial<Song> = {
                id: 'YhgzBNHA',
                name: 'Test Song',
                primaryArtists: 'Test Artist',
                downloadUrl: 'https://example.com/audio.mp4',
            };
            expect(isSongIncomplete(missingImage)).toBe(true);
        });

        it('returns false for complete song object', () => {
            const completeSong: Song = {
                id: 'YhgzBNHA',
                name: 'Lover Also Fighter Also',
                primaryArtists: 'Shekhar Ravjiani',
                duration: 236,
                image: 'https://example.com/cover.jpg',
                downloadUrl: 'https://example.com/audio.mp4',
            };
            expect(isSongIncomplete(completeSong)).toBe(false);
        });
    });

    describe('matchesCandidate', () => {
        it('returns true when candidate title and artist match target', () => {
            const candidate = {
                name: 'Kesariya',
                artists: { primary: [{ name: 'Arijit Singh' }] },
            };
            expect(matchesCandidate(candidate, 'Kesariya', 'Arijit Singh')).toBe(true);
        });

        it('returns false when title matches but artist mismatch', () => {
            const candidate = {
                name: 'Kesariya',
                artists: { primary: [{ name: 'Random Artist' }] },
            };
            expect(matchesCandidate(candidate, 'Kesariya', 'Different Artist')).toBe(false);
        });

        it('returns false for candidate with completely different title', () => {
            const candidate = {
                name: 'Something Else',
                artists: { primary: [{ name: 'Arijit Singh' }] },
            };
            expect(matchesCandidate(candidate, 'Kesariya', 'Arijit Singh')).toBe(false);
        });
    });

    describe('getUnsupportedReason', () => {
        it('detects radio stations, podcasts, audiobooks, and album types', () => {
            const radioItem: Song = { id: 'radio:123', name: 'Radio Station', primaryArtists: '', duration: 0, image: '', downloadUrl: '' };
            expect(getUnsupportedReason(radioItem)).toContain('Radio Station');

            const podcastItem: Song = { id: 'podcast:456', name: 'Podcast Episode', primaryArtists: '', duration: 0, image: '', downloadUrl: '' };
            expect(getUnsupportedReason(podcastItem)).toContain('Podcast Episode');

            const audiobookItem: Song = { id: 'audiobook:789', name: 'Audiobook Book', primaryArtists: '', duration: 0, image: '', downloadUrl: '' };
            expect(getUnsupportedReason(audiobookItem)).toContain('Audiobook');

            const albumItem: Song = { id: '999', type: 'album', name: 'Album Title', primaryArtists: '', duration: 0, image: '', downloadUrl: '' };
            expect(getUnsupportedReason(albumItem)).toContain('Unsupported item type: album');
        });

        it('returns null for standard song items', () => {
            const normalSong: Song = { id: 'KGfDrbWe', name: 'Kesariya', primaryArtists: 'Arijit Singh', duration: 200, image: '', downloadUrl: '' };
            expect(getUnsupportedReason(normalSong)).toBeNull();
        });
    });

    describe('mapApiSongToSong', () => {
        it('maps raw API item correctly to Song model while preserving original fallback ID', () => {
            const apiData = {
                id: 'NEW_ID_999',
                name: 'Lover Also Fighter Also',
                duration: 236,
                year: '2018',
                artists: {
                    primary: [{ name: 'Shekhar Ravjiani' }],
                },
                album: { id: '12709287', name: 'Naa Peru Surya' },
                image: [{ quality: '500x500', url: 'https://example.com/500.jpg' }],
                downloadUrl: [{ quality: '320kbps', url: 'https://example.com/320.mp4' }],
            };

            const mapped = mapApiSongToSong(apiData, 'ORIGINAL_FAV_ID');

            expect(mapped.id).toBe('ORIGINAL_FAV_ID');
            expect(mapped.name).toBe('Lover Also Fighter Also');
            expect(mapped.primaryArtists).toBe('Shekhar Ravjiani');
            expect(mapped.duration).toBe(236);
            expect(mapped.year).toBe('2018');
        });
    });

    describe('fetchSongByFallbackSearch', () => {
        it('performs fallback search and returns mapped song on matching title and artist', async () => {
            const existingSong: Song = {
                id: 'LEGACY_123',
                name: 'Kesariya',
                primaryArtists: 'Arijit Singh',
                duration: 0,
                image: '',
                downloadUrl: '',
            };

            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        results: [
                            {
                                id: 'KGfDrbWe',
                                name: 'Kesariya',
                                artists: { primary: [{ name: 'Arijit Singh' }] },
                                image: 'https://example.com/kesariya.jpg',
                                downloadUrl: 'https://example.com/kesariya.mp4',
                            },
                        ],
                    },
                },
            });

            const result = await fetchSongByFallbackSearch(existingSong, 1);
            expect(result.song).toBeDefined();
            expect(result.song?.id).toBe('LEGACY_123');
            expect(result.song?.name).toBe('Kesariya');
        });

        it('returns error when title and artist are missing for fallback search', async () => {
            const emptySong: Song = {
                id: 'EMPTY_123',
                name: '',
                primaryArtists: '',
                duration: 0,
                image: '',
                downloadUrl: '',
            };

            const result = await fetchSongByFallbackSearch(emptySong, 1);
            expect(result.song).toBeUndefined();
            expect(result.errorReason).toContain('Missing title and artist');
        });
    });

    describe('repairFavorites', () => {
        it('uses direct ID lookup first, then fallback search if direct ID lookup fails', async () => {
            const incompleteSong: Song = {
                id: 'OLD_ID_1',
                name: 'Kesariya',
                primaryArtists: 'Arijit Singh',
                duration: 0,
                image: '',
                downloadUrl: '',
            };

            // 1st call: direct ID lookup returns not found
            mockedAxios.get.mockResolvedValueOnce({
                data: { success: false, message: 'song not found' },
            });

            // 2nd call: fallback search returns verified match
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        results: [
                            {
                                id: 'KGfDrbWe',
                                name: 'Kesariya',
                                artists: { primary: [{ name: 'Arijit Singh' }] },
                                image: 'https://example.com/img.jpg',
                                downloadUrl: 'https://example.com/audio.mp4',
                            },
                        ],
                    },
                },
            });

            const report = await repairFavorites([incompleteSong], 'user-123', { concurrency: 1 });

            expect(report.repaired).toBe(1);
            expect(report.repairedSongs[0].id).toBe('OLD_ID_1');
            expect(report.repairedSongs[0].name).toBe('Kesariya');
        });

        it('classifies non-music items as unavailable with specific reason', async () => {
            const radioItem: Song = {
                id: 'radio:city_fm',
                name: 'City FM',
                primaryArtists: '',
                duration: 0,
                image: '',
                downloadUrl: '',
            };

            const report = await repairFavorites([radioItem], 'user-123', { concurrency: 1 });

            expect(report.repaired).toBe(0);
            expect(report.unavailable).toBe(1);
            expect(report.failedItems[0].reason).toContain('Radio Station');
        });
    });
});
