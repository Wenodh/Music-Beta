import { Song } from '../../../types/music';
import { GameTheme, ThemeSelectionMode } from '../types';
import { DEFAULT_THEME, PREDEFINED_THEMES } from './themeRegistry';
import { extractImageUrl } from '../../../utils/imageUtils';

export class SongThemeEngine {
    /**
     * Extracts reliable artist image URL from song metadata or returns undefined if none reliable.
     */
    public static resolveArtistImage(song: Song | null): string | undefined {
        if (!song) return undefined;

        // Check if song has explicit artist image or artists array with image
        const anySong = song as any;
        if (typeof anySong.artistImage === 'string' && anySong.artistImage.startsWith('http')) {
            return anySong.artistImage;
        }
        if (typeof anySong.artist_image === 'string' && anySong.artist_image.startsWith('http')) {
            return anySong.artist_image;
        }

        if (Array.isArray(anySong.artists)) {
            const firstWithImage = anySong.artists.find((a: any) => a?.image && typeof a.image === 'string');
            if (firstWithImage) return firstWithImage.image;
        } else if (anySong.artists && typeof anySong.artists === 'object') {
            const primary = anySong.artists.primary;
            if (Array.isArray(primary) && primary[0]?.image) {
                return typeof primary[0].image === 'string' ? primary[0].image : primary[0].image?.[0]?.url;
            }
        }

        return undefined;
    }

    /**
     * Resolves the appropriate theme based on user mode preference, manual selection, and active song metadata.
     * Incorporates song album artwork and resolved artist photo.
     */
    public static resolveTheme(
        currentSong: Song | null,
        mode: ThemeSelectionMode,
        manualThemeId?: string
    ): GameTheme {
        const albumArtwork = currentSong ? extractImageUrl(currentSong as any, '500x500') : undefined;
        const artistPhoto = this.resolveArtistImage(currentSong);

        let baseTheme = DEFAULT_THEME;

        if (mode === 'manual' && manualThemeId) {
            const found = PREDEFINED_THEMES.find(t => t.id === manualThemeId);
            if (found) baseTheme = found;
        } else if (mode !== 'default' && currentSong) {
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
                        baseTheme = theme;
                        break;
                    }
                }
                if (baseTheme.id !== DEFAULT_THEME.id) break;
            }
        }

        return {
            ...baseTheme,
            albumArtworkUrl: albumArtwork,
            artistImageUrl: artistPhoto,
        };
    }
}
