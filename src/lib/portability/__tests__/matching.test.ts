import { describe, it, expect } from 'vitest';
import { matchTrackAgainstCatalog, normalizeString, createUnresolvedSong } from '../matching';
import { PortableTrack } from '../types';
import { Song } from '../../../types/music';

describe('Track Matching & Duplicate Detection Engine', () => {
    const catalog: Song[] = [
        {
            id: 'saavn_123',
            name: 'Chaleya (From "Jawan")',
            primaryArtists: 'Arijit Singh, Shilpa Rao',
            duration: 200,
            image: '',
            downloadUrl: 'https://example.com/chaleya.mp3',
        },
        {
            id: 'saavn_456',
            name: 'Srivalli',
            primaryArtists: 'Sid Sriram',
            duration: 220,
            image: '',
            downloadUrl: 'https://example.com/srivalli.mp3',
        },
    ];

    it('normalizes song titles removing brackets, punctuation, and extra whitespace', () => {
        expect(normalizeString('Chaleya (Official Video) [HD]')).toBe('chaleya');
        expect(normalizeString('Srivalli - Lyric Video!')).toBe('srivalli');
    });

    it('matches priority 1: exact providerId', () => {
        const track: PortableTrack = {
            title: 'Chaleya',
            artist: 'Arijit Singh',
            providerId: 'saavn_123',
        };

        const match = matchTrackAgainstCatalog(track, catalog);
        expect(match).toBeDefined();
        expect(match?.id).toBe('saavn_123');
    });

    it('matches priority 3: strong title + artist match even with extra title noise', () => {
        const track: PortableTrack = {
            title: 'Chaleya Official Audio',
            artist: 'Arijit Singh, Shilpa Rao',
        };

        const match = matchTrackAgainstCatalog(track, catalog);
        expect(match).toBeDefined();
        expect(match?.id).toBe('saavn_123');
    });

    it('preserves unmatched tracks as unresolved items without dropping metadata', () => {
        const track: PortableTrack = {
            title: 'Unreleased Track',
            artist: 'Indie Artist',
            album: 'Indie Album',
            duration: 180,
            provider: 'spotify',
            providerId: 'spot_999',
        };

        const match = matchTrackAgainstCatalog(track, catalog);
        expect(match).toBeUndefined();

        const unresolvedSong = createUnresolvedSong(track);
        expect(unresolvedSong.id).toContain('unresolved_');
        expect(unresolvedSong.name).toBe('Unreleased Track');
        expect(unresolvedSong.primaryArtists).toBe('Indie Artist');
        expect(unresolvedSong.duration).toBe(180);
    });
});
