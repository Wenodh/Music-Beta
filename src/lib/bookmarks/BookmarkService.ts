import { Bookmark } from '../audio-sdk/models';
import { saveBookmark, getBookmarks, deleteBookmark } from '../../utils/db';
import { eventBus, Events } from '../events';

export class BookmarkService {
    private static instance: BookmarkService;

    private constructor() {}

    public static getInstance(): BookmarkService {
        if (!BookmarkService.instance) {
            BookmarkService.instance = new BookmarkService();
        }
        return BookmarkService.instance;
    }

    async addBookmark(mediaId: string, chapterId: string, position: number, title?: string, note?: string): Promise<Bookmark> {
        const bookmark: Bookmark = {
            id: `bm_${mediaId}_${Date.now()}`,
            mediaId,
            chapterId,
            position,
            title,
            note,
            createdAt: new Date().toISOString(),
        };

        await saveBookmark(bookmark);
        eventBus.emit(Events.BOOKMARK_ADDED, bookmark);
        return bookmark;
    }

    async getBookmarksForMedia(mediaId: string): Promise<Bookmark[]> {
        return getBookmarks(mediaId);
    }

    async removeBookmark(id: string): Promise<void> {
        await deleteBookmark(id);
        eventBus.emit(Events.BOOKMARK_REMOVED, id);
    }
}

export const bookmarkService = BookmarkService.getInstance();
