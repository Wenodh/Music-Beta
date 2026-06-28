import { Song } from '../../types/music';
import { MediaItem, Artwork, PlayableSource } from './models';

export const songToMediaItem = (song: Song, provider: string = 'jiosaavn'): MediaItem => {
    const artwork: Artwork[] = Array.isArray(song.image)
        ? song.image.map(img => ({ url: img.url, quality: img.quality }))
        : (typeof song.image === 'string' ? [{ url: song.image }] : []);

    const downloadUrl = song.downloadUrl || song.music;
    let stream: PlayableSource | undefined;

    if (Array.isArray(downloadUrl) && downloadUrl.length > 0) {
        // We pick the best quality for the default stream in MediaItem if needed,
        // but typically AudioSDK.getPlayableSource will be used for actual playback.
        const best = downloadUrl[downloadUrl.length - 1];
        stream = {
            url: best.url,
            format: 'mp3', // Defaulting to mp3 for jiosaavn
            bitrate: parseInt(best.quality) || undefined,
        };
    } else if (typeof downloadUrl === 'string' && downloadUrl) {
        stream = {
            url: downloadUrl,
            format: 'mp3',
        };
    }

    return {
        id: song.id,
        provider,
        type: 'song',
        title: song.name,
        subtitle: song.primaryArtists,
        description: typeof song.album === 'object' ? song.album.name : (song.albumName || song.album),
        artwork,
        playable: true,
        duration: typeof song.duration === 'string' ? parseInt(song.duration) : song.duration,
        stream,
        explicit: song.explicitContent,
        language: song.language,
        metadata: {
            ...song, // Preserve original song data in metadata
        }
    };
};

export const mediaItemToSong = (item: MediaItem): Song => {
    const metadata = item.metadata as Partial<Song>;

    return {
        ...metadata,
        id: item.id,
        name: item.title,
        type: item.type,
        primaryArtists: item.subtitle || '',
        duration: item.duration || 0,
        explicitContent: !!item.explicit,
        language: item.language || '',
        image: item.artwork.map(a => ({ quality: a.quality || 'unknown', url: a.url })),
        downloadUrl: item.stream ? [{ quality: '320kbps', url: item.stream.url }] : [],
    } as Song;
};
