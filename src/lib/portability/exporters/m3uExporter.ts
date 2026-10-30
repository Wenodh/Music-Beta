import { Song } from '../../../types/music';

export function exportToM3u(songs: Song[], playlistTitle?: string): string {
    const lines: string[] = ['#EXTM3U'];

    if (playlistTitle) {
        lines.push(`#PLAYLIST:${playlistTitle}`);
    }

    songs.forEach((song) => {
        const title = song.name || song.title || 'Unknown Title';
        const artist = song.primaryArtists || 'Unknown Artist';
        const sec = typeof song.duration === 'number' ? Math.round(song.duration) : parseInt(String(song.duration), 10) || 0;

        lines.push(`#EXTINF:${sec},${artist} - ${title}`);

        const url =
            typeof song.downloadUrl === 'string'
                ? song.downloadUrl
                : Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0
                ? song.downloadUrl[song.downloadUrl.length - 1].url
                : '';

        lines.push(url || `# UNRESOLVED STREAM URL FOR ID ${song.id}`);
    });

    return `\uFEFF${lines.join('\r\n')}`;
}
