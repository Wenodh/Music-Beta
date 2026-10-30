import { PortableTrack } from '../types';

export interface M3uParseResult {
    playlistName?: string;
    tracks: PortableTrack[];
    errors: string[];
}

/**
 * Parses M3U or M3U8 content into PortableTrack items.
 */
export function parseM3u(m3uContent: string, fileName?: string): M3uParseResult {
    if (!m3uContent || !m3uContent.trim()) {
        return { tracks: [], errors: ['M3U playlist content is empty.'] };
    }

    let text = m3uContent;
    if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1); // strip UTF-8 BOM
    }

    const lines = text.split(/\r?\n/);
    const tracks: PortableTrack[] = [];
    const errors: string[] = [];

    let currentDuration: string | number | undefined = undefined;
    let currentArtist: string = 'Unknown Artist';
    let currentTitle: string = '';

    let detectedPlaylistName = fileName ? fileName.replace(/\.(m3u8?|txt)$/i, '') : undefined;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#PLAYLIST:')) {
            const pName = line.substring(10).trim();
            if (pName) detectedPlaylistName = pName;
        } else if (line.startsWith('#EXTINF:')) {
            // Format: #EXTINF:seconds,Artist - Title  OR  #EXTINF:seconds,Title
            const commaIndex = line.indexOf(',');
            if (commaIndex !== -1) {
                const info = line.substring(8, commaIndex).trim();
                const display = line.substring(commaIndex + 1).trim();

                const sec = parseInt(info, 10);
                if (!isNaN(sec) && sec > 0) {
                    currentDuration = sec;
                }

                const dashParts = display.split(/\s*[-–—]\s*/);
                if (dashParts.length >= 2) {
                    currentArtist = dashParts[0].trim();
                    currentTitle = dashParts.slice(1).join(' - ').trim();
                } else {
                    currentArtist = 'Unknown Artist';
                    currentTitle = display;
                }
            }
        } else if (line.startsWith('#')) {
            // Ignore other directives e.g. #EXTM3U
            continue;
        } else {
            // Line is path or URL
            const location = line;
            const title = currentTitle || extractFilenameTitle(location);
            const artist = currentArtist;

            // If location is a URL, extract domain/provider if possible
            let provider: string | undefined = undefined;
            let sourceUrl: string | undefined = undefined;

            if (/^https?:\/\//i.test(location)) {
                sourceUrl = location;
                if (location.includes('jiosaavn') || location.includes('saavn')) {
                    provider = 'jiosaavn';
                }
            }

            tracks.push({
                title: title || 'Unknown Track',
                artist: artist || 'Unknown Artist',
                duration: currentDuration,
                sourceUrl,
                provider,
                playlistName: detectedPlaylistName,
                playlistPosition: tracks.length + 1,
            });

            // Reset for next entry
            currentDuration = undefined;
            currentArtist = 'Unknown Artist';
            currentTitle = '';
        }
    }

    return {
        playlistName: detectedPlaylistName,
        tracks,
        errors,
    };
}

function extractFilenameTitle(pathOrUrl: string): string {
    const parts = pathOrUrl.split(/[/\\]/);
    const filename = parts[parts.length - 1] || pathOrUrl;
    return filename.replace(/\.[a-z0-9]{2,4}$/i, '');
}
