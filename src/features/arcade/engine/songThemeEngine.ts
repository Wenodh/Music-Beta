import { Song } from '../../../types/music';
import { GameTheme, ThemeSelectionMode } from '../types';
import { DEFAULT_THEME, PREDEFINED_THEMES } from './themeRegistry';

export class SongThemeEngine {
    /**
     * Resolves the appropriate theme based on user mode preference, manual selection, and active song metadata.
     */
    public static resolveTheme(
        currentSong: Song | null,
        mode: ThemeSelectionMode,
        manualThemeId?: string
    ): GameTheme {
        if (mode === 'default') {
            return DEFAULT_THEME;
        }

        if (mode === 'manual' && manualThemeId) {
            const found = PREDEFINED_THEMES.find(t => t.id === manualThemeId);
            if (found) return found;
        }

        // Automatic matching against currentSong metadata
        if (!currentSong) {
            return DEFAULT_THEME;
        }

        const songText = [
            currentSong.name || '',
            typeof currentSong.primaryArtists === 'string' ? currentSong.primaryArtists : '',
            typeof currentSong.album === 'string' ? currentSong.album : currentSong.album?.name || '',
            (currentSong as any).language || '',
        ].join(' ').toLowerCase();

        for (const theme of PREDEFINED_THEMES) {
            if (theme.id === DEFAULT_THEME.id) continue;
            for (const keyword of theme.keywords) {
                if (songText.includes(keyword.toLowerCase())) {
                    return theme;
                }
            }
        }

        return DEFAULT_THEME;
    }
}
