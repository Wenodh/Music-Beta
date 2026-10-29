import { Song } from '../../types/music';

export type BackupFormatType = 'vibeon-library';

export interface PlaylistBackup {
    id: string;
    name: string;
    songs: Song[];
}

export interface PlaylistItemReference {
    playlistId: string;
    songId: string;
    position: number;
    originalMetadata?: PortableTrack;
}

export interface TrackSourceReference {
    songId: string;
    provider: string;
    providerId: string;
    sourceUrl?: string;
}

export interface VibeOnBackupEnvelope {
    format: BackupFormatType;
    formatVersion: number;
    exportedAt: string;
    appVersion?: string;
    library: {
        tracks?: Song[];
        favorites: Song[];
        playlists: PlaylistBackup[];
        playlistItems?: PlaylistItemReference[];
        trackSources?: TrackSourceReference[];
    };
}

export interface PortableTrack {
    id?: string;
    title: string;
    artist: string;
    album?: string;
    duration?: number | string;
    year?: string | number;
    language?: string;
    artworkUrl?: string;
    provider?: string;
    providerId?: string;
    sourceUrl?: string;
    isrc?: string;
    playlistName?: string;
    playlistPosition?: number;
    rawText?: string;
    isUnresolved?: boolean;
    matchedSong?: Song;
}

export type ImportMode = 'merge' | 'replace';

export type ImportFileType = 'json' | 'csv' | 'txt' | 'm3u' | 'm3u8' | 'unknown';

export interface ImportPreviewResult {
    fileType: ImportFileType;
    fileName: string;
    totalEntries: number;
    parsedTracks: PortableTrack[];
    matchedCount: number;
    unmatchedCount: number;
    ambiguousCount: number;
    detectedPlaylists: string[];
    suggestedFormat: string;
}

export interface ImportSummary {
    totalFound: number;
    matched: number;
    newlyImported: number;
    alreadyPresent: number;
    ambiguous: number;
    unmatched: number;
    failedWrites: number;
    skipped: number;
    errors: string[];
}

export interface ExportOptions {
    format: 'json' | 'csv' | 'txt' | 'm3u8';
    scope: 'full' | 'favorites' | 'playlist';
    playlistId?: string;
}

export interface ImportOptions {
    mode: ImportMode;
    targetPlaylistName?: string;
    customMatches?: Record<number, Song>; // map index in parsedTracks -> resolved Song
}

export interface ProviderAdapter {
    providerName: string;
    searchTracks(query: string, limit?: number): Promise<Song[]>;
    getTrackById(id: string): Promise<Song | null>;
}
