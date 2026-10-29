import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isSongIncomplete,
    mapApiSongToSong,
    fetchSongDetailsWithRetry,
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
                    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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

    describe('mapApiSongToSong', () => {
        it('maps raw API item correctly to Song model', () => {
            const apiData = {
                id: 'YhgzBNHA',
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

            const mapped = mapApiSongToSong(apiData, 'YhgzBNHA');

            expect(mapped.id).toBe('YhgzBNHA');
            expect(mapped.name).toBe('Lover Also Fighter Also');
            expect(mapped.primaryArtists).toBe('Shekhar Ravjiani');
            expect(mapped.duration).toBe(236);
            expect(mapped.year).toBe('2018');
            expect(mapped.image).toEqual(apiData.image);
            expect(mapped.downloadUrl).toEqual(apiData.downloadUrl);
        });
    });

    describe('fetchSongDetailsWithRetry', () => {
        it('returns mapped song when API call succeeds', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: [
                        {
                            id: 'YhgzBNHA',
                            name: 'Lover Also Fighter Also',
                            artists: { primary: [{ name: 'Shekhar Ravjiani' }] },
                            image: 'https://example.com/cover.jpg',
                            downloadUrl: 'https://example.com/audio.mp4',
                        },
                    ],
                },
            });

            const result = await fetchSongDetailsWithRetry('YhgzBNHA', 1);

            expect(result.song).toBeDefined();
            expect(result.song?.name).toBe('Lover Also Fighter Also');
            expect(result.song?.primaryArtists).toBe('Shekhar Ravjiani');
        });

        it('handles 404 / song not found correctly without retrying', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: false,
                    message: 'song not found',
                },
            });

            const result = await fetchSongDetailsWithRetry('invalid_id', 1);

            expect(result.song).toBeUndefined();
            expect(result.isNotFound).toBe(true);
            expect(result.isRetryable).toBe(false);
        });

        it('retries on network/5xx error and backoff', async () => {
            mockedAxios.get
                .mockRejectedValueOnce({ response: { status: 500 }, message: 'Server Error' })
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        data: [
                            {
                                id: 'YhgzBNHA',
                                name: 'Recovered Song',
                                artists: { primary: [{ name: 'Artist' }] },
                                image: 'https://example.com/img.jpg',
                                downloadUrl: 'https://example.com/audio.mp4',
                            },
                        ],
                    },
                });

            const result = await fetchSongDetailsWithRetry('YhgzBNHA', 2);

            expect(result.song).toBeDefined();
            expect(result.song?.name).toBe('Recovered Song');
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('repairFavorites', () => {
        it('skips complete songs and repairs incomplete songs', async () => {
            const completeSong: Song = {
                id: '1',
                name: 'Complete Song',
                primaryArtists: 'Artist 1',
                duration: 180,
                image: 'https://example.com/1.jpg',
                downloadUrl: 'https://example.com/1.mp4',
            };

            const incompleteSong: Song = {
                id: '2',
                name: '',
                primaryArtists: '',
                duration: 0,
                image: '',
                downloadUrl: '',
            };

            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: [
                        {
                            id: '2',
                            name: 'Repaired Song 2',
                            artists: { primary: [{ name: 'Artist 2' }] },
                            image: 'https://example.com/2.jpg',
                            downloadUrl: 'https://example.com/2.mp4',
                        },
                    ],
                },
            });

            const report = await repairFavorites([completeSong, incompleteSong], 'user-123', {
                concurrency: 2,
            });

            expect(report.totalChecked).toBe(2);
            expect(report.alreadyComplete).toBe(1);
            expect(report.repaired).toBe(1);
            expect(report.repairedSongs[0].name).toBe('Repaired Song 2');
        });

        it('supports forceAll option to recheck all songs', async () => {
            const completeSong: Song = {
                id: '1',
                name: 'Complete Song',
                primaryArtists: 'Artist 1',
                duration: 180,
                image: 'https://example.com/1.jpg',
                downloadUrl: 'https://example.com/1.mp4',
            };

            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: [
                        {
                            id: '1',
                            name: 'Rechecked Complete Song',
                            artists: { primary: [{ name: 'Artist 1' }] },
                            image: 'https://example.com/1-new.jpg',
                            downloadUrl: 'https://example.com/1-new.mp4',
                        },
                    ],
                },
            });

            const report = await repairFavorites([completeSong], 'user-123', {
                concurrency: 1,
                forceAll: true,
            });

            expect(report.totalChecked).toBe(1);
            expect(report.alreadyComplete).toBe(0);
            expect(report.repaired).toBe(1);
            expect(report.repairedSongs[0].name).toBe('Rechecked Complete Song');
        });

        it('returns zero repaired for empty favorites list without throwing', async () => {
            const report = await repairFavorites([], 'user-123');

            expect(report.totalChecked).toBe(0);
            expect(report.alreadyComplete).toBe(0);
            expect(report.repaired).toBe(0);
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });
    });
});
