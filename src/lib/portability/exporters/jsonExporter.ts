import { Song } from '../../../types/music';
import { VibeOnBackupEnvelope, PlaylistBackup } from '../types';

export function exportToJson(
    favorites: Song[],
    playlists: { id: string; name: string; songs: Song[] }[],
    appVersion: string = '1.3.1'
): string {
    const backupPlaylists: PlaylistBackup[] = playlists.map((p) => ({
        id: p.id,
        name: p.name,
        songs: p.songs,
    }));

    const envelope: VibeOnBackupEnvelope = {
        format: 'vibeon-library',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        appVersion,
        library: {
            favorites: favorites || [],
            playlists: backupPlaylists,
        },
    };

    return JSON.stringify(envelope, null, 2);
}
