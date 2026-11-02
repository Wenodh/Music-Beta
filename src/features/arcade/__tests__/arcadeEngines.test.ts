import { describe, it, expect } from 'vitest';
import { SongThemeEngine } from '../engine/songThemeEngine';
import { DEFAULT_THEME, PREDEFINED_THEMES } from '../engine/themeRegistry';
import { DialogueEngine, ORIGINAL_DIALOGUES } from '../engine/dialogueEngine';
import { Song } from '../../../types/music';

describe('Vibe Arcade - SongThemeEngine', () => {
    it('returns DEFAULT_THEME when mode is default', () => {
        const theme = SongThemeEngine.resolveTheme(null, 'default');
        expect(theme.id).toBe(DEFAULT_THEME.id);
    });

    it('returns DEFAULT_THEME when song is null and mode is auto', () => {
        const theme = SongThemeEngine.resolveTheme(null, 'auto');
        expect(theme.id).toBe(DEFAULT_THEME.id);
    });

    it('matches Telugu mass beats theme based on artist keywords', () => {
        const song: Song = {
            id: '1',
            name: 'Kurchi Madathapetti',
            primaryArtists: 'Thaman S, Mahesh Babu',
            duration: 200,
            image: '',
            downloadUrl: '',
        };
        const theme = SongThemeEngine.resolveTheme(song, 'auto');
        expect(theme.id).toBe('tollywood-beats');
    });

    it('matches Bollywood groove theme based on language/artist keywords', () => {
        const song: Song = {
            id: '2',
            name: 'Tum Hi Ho',
            primaryArtists: 'Arijit Singh',
            duration: 260,
            image: '',
            downloadUrl: '',
        };
        const theme = SongThemeEngine.resolveTheme(song, 'auto');
        expect(theme.id).toBe('bollywood-groove');
    });

    it('honors manual theme override', () => {
        const theme = SongThemeEngine.resolveTheme(null, 'manual', 'global-pop-rock');
        expect(theme.id).toBe('global-pop-rock');
    });
});

describe('Vibe Arcade - DialogueEngine', () => {
    it('returns predefined non-empty dialogue text', () => {
        const line = DialogueEngine.getRandomDialogue('start', 'english');
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
    });

    it('selects Telugu dialogue when song language is telugu and mode is auto', () => {
        const line = DialogueEngine.getRandomDialogue('game-over', 'auto', 'telugu');
        const teluguTexts = ORIGINAL_DIALOGUES.filter(d => d.language === 'telugu').map(d => d.text);
        expect(teluguTexts).toContain(line);
    });

    it('returns high score celebration dialogue', () => {
        const line = DialogueEngine.getRandomDialogue('new-high-score', 'english');
        expect(line).toContain('High Score');
    });
});
