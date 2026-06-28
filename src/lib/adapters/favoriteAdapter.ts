import { MediaItem, FavoriteItem } from '../audio-sdk/models';

export const mediaItemToFavorite = (media: MediaItem): FavoriteItem => {
    return {
        id: media.id,
        media,
        createdAt: new Date().toISOString()
    };
};
