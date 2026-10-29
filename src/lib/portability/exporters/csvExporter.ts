import { Song } from '../../../types/music';
import { extractImageUrl } from '../../../utils/imageUtils';

export function exportToCsv(songs: Song[], playlistName?: string): string {
    const headers = [
        'Title',
        'Artist',
        'Album',
        'Duration',
        'Year',
        'Language',
        'Artwork',
        'Provider',
        'Provider ID',
        'Source URL',
        'Playlist Name',
        'Playlist Position',
    ];

    const rows: string[][] = [headers];

    songs.forEach((song, idx) => {
        const title = song.name || song.title || '';
        const artist = song.primaryArtists || '';
        const album = typeof song.album === 'object' ? song.album?.name : song.album || '';
        const duration = song.duration ? String(song.duration) : '';
        const year = song.year ? String(song.year) : '';
        const language = song.language || '';
        const artwork = extractImageUrl(song as any) || '';
        const provider = song.type || 'jiosaavn';
        const providerId = song.id || '';
        const sourceUrl =
            typeof song.downloadUrl === 'string'
                ? song.downloadUrl
                : Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0
                ? song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[0]?.url || ''
                : '';

        rows.push([
            title,
            artist,
            album,
            duration,
            year,
            language,
            artwork,
            provider,
            providerId,
            sourceUrl,
            playlistName || '',
            String(idx + 1),
        ]);
    });

    const csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\r\n');
    return `\uFEFF${csvContent}`;
}

function escapeCsvField(field: string): string {
    if (field === null || field === undefined) return '""';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
