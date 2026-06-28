import { Song } from '../../types/music';

export type RepeatMode = 'none' | 'all' | 'one';

export interface PlaybackState {
    songs: Song[];
    currentSong: Song | null;
    shuffle: boolean;
    repeatMode: RepeatMode;
}

export class PlaybackEngine {
    static getNextSong(
        state: PlaybackState,
        isManual: boolean = true
    ): Song | null {
        const { songs, currentSong, shuffle, repeatMode } = state;
        if (songs.length === 0) return null;
        if (!currentSong) return songs[0];

        const currentIndex = songs.findIndex((song) => song.id === currentSong.id);

        if (!isManual && repeatMode === 'one') {
            return currentSong;
        }

        let nextIndex;
        if (shuffle) {
            nextIndex = Math.floor(Math.random() * songs.length);
            if (nextIndex === currentIndex && songs.length > 1) {
                nextIndex = (nextIndex + 1) % songs.length;
            }
        } else {
            nextIndex = (currentIndex + 1) % songs.length;
            if (!isManual && currentIndex === songs.length - 1 && repeatMode === 'none') {
                return null;
            }
        }

        return songs[nextIndex];
    }

    static getPrevSong(state: PlaybackState): Song | null {
        const { songs, currentSong, shuffle } = state;
        if (songs.length === 0) return null;
        if (!currentSong) return songs[songs.length - 1];

        const currentIndex = songs.findIndex((song) => song.id === currentSong.id);

        let prevIndex;
        if (shuffle) {
            prevIndex = Math.floor(Math.random() * songs.length);
            if (prevIndex === currentIndex && songs.length > 1) {
                prevIndex = (prevIndex - 1 + songs.length) % songs.length;
            }
        } else {
            prevIndex = (currentIndex - 1 + songs.length) % songs.length;
        }

        return songs[prevIndex];
    }

    static formatSong(song: Partial<Song> & { music?: any; downloadUrl?: any }, preferredQuality: string): Song {
        const downloadUrl = song.downloadUrl || song.music;
        let musicUrl = downloadUrl;
        if (Array.isArray(downloadUrl)) {
            musicUrl = downloadUrl.find((d: any) => d.quality === preferredQuality)?.url ||
                       downloadUrl[downloadUrl.length - 1]?.url;
        }

        return {
            ...song,
            type: 'song',
            image: Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image,
            downloadUrl: downloadUrl,
            music: musicUrl,
        } as Song;
    }
}
