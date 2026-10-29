// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isSongIncomplete,
    matchesCandidate,
    extractArtists,
    mapApiSongToSong,
    getUnsupportedReason,
    fetchSongDetailsWithRetry,
    fetchSongByFallbackSearch,
    repairFavorites,
    saveCheckpoint,
    loadCheckpoint,
    clearCheckpoint,
} from './favoriteRecoveryService';
import { Song } from '../types/music';
import axios from 'axios';
import { supabase } from '../lib/supabase';

vi.mock('axios');
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock('../utils/db', () => ({
    getOfflineSong: vi.fn().mockResolvedValue(null),
    saveSongOffline: vi.fn().mockResolvedValue(undefined),
}));

describe('favoriteRecoveryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.clear();
        }
    });

    describe('isSongIncomplete', () => {
        it('returns true for null or undefined song', () => {
            expect(isSongIncomplete(null)).toBe(true);
            expect(isSongIncomplete(undefined)).toBe(true);
        });

        it('returns true when id, name, or primaryArtists are missing', () => {
            expect(isSongIncomplete({ id: '', name: 'Test', primaryArtists: 'Artist', image: 'http://img', downloadUrl: 'http://audio' })).toBe(true);
            expect(isSongIncomplete({ id: '123', name: '', primaryArtists: 'Artist', image: 'http://img', downloadUrl: 'http://audio' })).toBe(true);
            expect(isSongIncomplete({ id: '123', name: 'Test', primaryArtists: '', image: 'http://img', downloadUrl: 'http://audio' })).toBe(true);
        });

        it('returns true when image or streaming URL is missing', () => {
            expect(isSongIncomplete({ id: '123', name: 'Test', primaryArtists: 'Artist', image: '', downloadUrl: 'http://audio' })).toBe(true);
            expect(isSongIncomplete({ id: '123', name: 'Test', primaryArtists: 'Artist', image: 'http://img', downloadUrl: '' })).toBe(true);
        });

        it('returns false for complete song object with valid array URLs', () => {
            const validSong: Song = {
                id: '54BMoFYS',
                name: 'Ragala Pallakilo',
                primaryArtists: 'S.P. Balasubrahmanyam',
                duration: 266,
                image: [{ url: 'https://c.saavncdn.com/500x500.jpg', quality: '500x500' }],
                downloadUrl: [{ url: 'https://aac.saavncdn.com/320.mp4', quality: '320kbps' }],
            };
            expect(isSongIncomplete(validSong)).toBe(false);
        });
    });

    describe('HTML entity decoding and mapping', () => {
        it('decodes HTML entities in song name, artists, and album', () => {
            const apiData = {
                id: '54BMoFYS',
                name: 'Ragala Pallakilo (From &quot;Subhalekha&quot;)',
                artists: {
                    primary: [
                        { name: 'S.P. Balasubrahmanyam &amp; P. Susheela' },
                    ],
                },
                album: { id: '2577146', name: 'Chiranjeevi Birthday Special &apos;16' },
                image: 'https://c.saavncdn.com/500x500.jpg',
                downloadUrl: 'https://aac.saavncdn.com/320.mp4',
            };

            const song = mapApiSongToSong(apiData, '54BMoFYS');
            expect(song.name).toBe('Ragala Pallakilo (From "Subhalekha")');
            expect(song.primaryArtists).toBe("S.P. Balasubrahmanyam & P. Susheela");
            expect(typeof song.album === 'object' && song.album?.name).toBe("Chiranjeevi Birthday Special '16");
        });

        it('extracts artists from artists.primary, artists.all, or primaryArtists string', () => {
            expect(extractArtists({ artists: { primary: [{ name: 'Artist A' }] } })).toBe('Artist A');
            expect(extractArtists({ artists: { all: [{ name: 'Artist B' }] } })).toBe('Artist B');
            expect(extractArtists({ primaryArtists: 'Artist C &amp; D' })).toBe('Artist C & D');
        });
    });

    describe('matchesCandidate', () => {
        it('matches candidate when normalized title and artist match', () => {
            const candidate = {
                name: 'Ragala Pallakilo (From &quot;Subhalekha&quot;)',
                primaryArtists: 'S.P. Balasubrahmanyam',
            };
            expect(matchesCandidate(candidate, 'Ragala Pallakilo', 'S.P. Balasubrahmanyam')).toBe(true);
        });

        it('returns false when title or artist does not match', () => {
            const candidate = { name: 'Different Song', primaryArtists: 'S.P. Balasubrahmanyam' };
            expect(matchesCandidate(candidate, 'Ragala Pallakilo', 'S.P. Balasubrahmanyam')).toBe(false);
        });
    });

    describe('getUnsupportedReason', () => {
        it('detects non-music types correctly', () => {
            expect(getUnsupportedReason({ id: 'radio:123', name: 'Radio', primaryArtists: 'DJ', duration: 0, image: '', downloadUrl: '' })).toContain('Radio Station');
            expect(getUnsupportedReason({ id: 'podcast:456', name: 'Podcast', primaryArtists: 'Host', duration: 0, image: '', downloadUrl: '' })).toContain('Podcast Episode');
            expect(getUnsupportedReason({ id: 'librivox:789', name: 'Audiobook', primaryArtists: 'Author', duration: 0, image: '', downloadUrl: '' })).toContain('Audiobook');
            expect(getUnsupportedReason({ id: '54BMoFYS', name: 'Song', primaryArtists: 'Singer', duration: 200, image: 'http', downloadUrl: 'http' })).toBeNull();
        });
    });

    describe('fetchSongDetailsWithRetry', () => {
        it('successfully fetches and maps song metadata from primary endpoint', async () => {
            (axios.get as any).mockResolvedValueOnce({
                data: {
                    success: true,
                    data: [
                        {
                            id: '54BMoFYS',
                            name: 'Ragala Pallakilo',
                            artists: { primary: [{ name: 'S.P. Balasubrahmanyam' }] },
                            image: [{ url: 'http://img', quality: '500x500' }],
                            downloadUrl: [{ url: 'http://audio', quality: '320kbps' }],
                        },
                    ],
                },
            });

            const result = await fetchSongDetailsWithRetry('54BMoFYS');
            expect(result.song?.id).toBe('54BMoFYS');
            expect(result.song?.name).toBe('Ragala Pallakilo');
            expect(result.song?.primaryArtists).toBe('S.P. Balasubrahmanyam');
        });

        it('fails over to fallback endpoint if primary endpoint throws error', async () => {
            (axios.get as any)
                .mockRejectedValueOnce(new Error('Primary network failure'))
                .mockResolvedValueOnce({
                    data: {
                        success: true,
                        data: [
                            {
                                id: '54BMoFYS',
                                name: 'Ragala Pallakilo',
                                primaryArtists: 'S.P. Balasubrahmanyam',
                                image: 'http://img',
                                downloadUrl: 'http://audio',
                            },
                        ],
                    },
                });

            const result = await fetchSongDetailsWithRetry('54BMoFYS');
            expect(result.song?.id).toBe('54BMoFYS');
        });
    });

    describe('repairFavorites with Supabase errors, Dry-Run mode, and Checkpoints', () => {
        it('operates in dry-run mode without modifying Supabase', async () => {
            (axios.get as any).mockResolvedValue({
                data: {
                    success: true,
                    data: [
                        {
                            id: '54BMoFYS',
                            name: 'Ragala Pallakilo',
                            primaryArtists: 'S.P. Balasubrahmanyam',
                            image: 'http://img',
                            downloadUrl: 'http://audio',
                        },
                    ],
                },
            });

            const incompleteSong: Song = { id: '54BMoFYS', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' };
            const report = await repairFavorites([incompleteSong], 'user-123', {
                isDryRun: true,
                resumeCheckpoint: false,
            });

            expect(report.repaired).toBe(1);
            expect(report.isDryRun).toBe(true);
            expect(supabase.from).not.toHaveBeenCalled();
        });

        it('handles zero-row update error from Supabase correctly', async () => {
            (axios.get as any).mockResolvedValue({
                data: {
                    success: true,
                    data: [
                        {
                            id: '54BMoFYS',
                            name: 'Ragala Pallakilo',
                            primaryArtists: 'S.P. Balasubrahmanyam',
                            image: 'http://img',
                            downloadUrl: 'http://audio',
                        },
                    ],
                },
            });

            const mockUpdate = vi.fn().mockReturnThis();
            const mockEq1 = vi.fn().mockReturnThis();
            const mockEq2 = vi.fn().mockReturnThis();
            const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });

            (supabase.from as any).mockReturnValue({
                update: mockUpdate,
            });
            mockUpdate.mockReturnValue({ eq: mockEq1 });
            mockEq1.mockReturnValue({ eq: mockEq2 });
            mockEq2.mockReturnValue({ select: mockSelect });

            const incompleteSong: Song = { id: '54BMoFYS', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' };
            const report = await repairFavorites([incompleteSong], 'user-123', {
                isDryRun: false,
                resumeCheckpoint: false,
            });

            expect(report.failed).toBe(1);
            expect(report.failedItems[0].reason).toContain('matched 0 rows');
        });

        it('saves and clears checkpoint state correctly', () => {
            saveCheckpoint({
                processedIds: ['54BMoFYS'],
                repairedSongs: [],
                failedItems: [],
                timestamp: Date.now(),
            });

            const loaded = loadCheckpoint();
            expect(loaded?.processedIds).toEqual(['54BMoFYS']);

            clearCheckpoint();
            expect(loadCheckpoint()).toBeNull();
        });

        it('respects limit option for testing 3 items batch', async () => {
            (axios.get as any).mockResolvedValue({
                data: {
                    success: true,
                    data: [
                        { id: '1', name: 'S1', primaryArtists: 'A1', image: 'http', downloadUrl: 'http' },
                    ],
                },
            });

            const items: Song[] = [
                { id: '1', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' },
                { id: '2', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' },
                { id: '3', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' },
                { id: '4', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' },
                { id: '5', name: '', primaryArtists: '', duration: 0, image: '', downloadUrl: '' },
            ];

            const report = await repairFavorites(items, 'user-123', {
                isDryRun: true,
                limit: 3,
                resumeCheckpoint: false,
            });

            expect(report.repaired + report.failed + report.unavailable).toBe(3);
        });
    });
});
