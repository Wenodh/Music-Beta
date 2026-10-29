import { Song } from '../../../types/music';

export function exportToTxt(songs: Song[]): string {
    const lines = songs.map((song) => {
        const artist = song.primaryArtists || 'Unknown Artist';
        const title = song.name || song.title || 'Unknown Title';
        return `${artist} - ${title}`;
    });

    return lines.join('\r\n');
}
