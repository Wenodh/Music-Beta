import { Song } from '../../types/music';
import { MediaItem } from '../audio-sdk/models';
import { songToMediaItem } from '../audio-sdk/adapters';

export class QueueAdapter {
    static getMediaItems(songs: Song[]): MediaItem[] {
        return songs.map(song => songToMediaItem(song));
    }

    static getSongQueue(items: MediaItem[]): Song[] {
        // This would be needed if we were migrating Redux to MediaItem
        // but keeping some UI on Song. For Phase 1 we go the other way.
        return [];
    }
}
