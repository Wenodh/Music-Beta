import { Bookmark } from '../audio-sdk/models';
import { saveBookmark, getBookmarks, deleteBookmark } from '../../utils/db';
import { eventBus, Events } from '../events';
import { syncManager } from '../sync/SyncManager';

export class BookmarkService {
    private static instance: BookmarkService;

    private constructor() {}

    public static getInstance(): BookmarkService {
        if (!BookmarkService.instance) {
            BookmarkService.instance = new BookmarkService();
        }
        return BookmarkService.instance;
    }

    async addBookmark(mediaId: string, provider: string, chapterId: string, position: number, title?: string, note?: string): Promise<Bookmark> {
        const bookmark: Bookmark = {
            id: crypto.randomUUID(),
            mediaId,
            provider,
            chapterId,
            position,
            title,
            note,
            createdAt: new Date().toISOString(),
        };

        await saveBookmark(bookmark);

        // Sync bookmark
        await syncManager.enqueue('bookmark', 'create', {
            ...bookmark,
            media_id: mediaId,
        });

        eventBus.emit(Events.BOOKMARK_ADDED, bookmark);
        return bookmark;
    }

    async getBookmarksForMedia(mediaId: string): Promise<Bookmark[]> {
        return getBookmarks(mediaId);
    }

    async removeBookmark(id: string): Promise<void> {
        await deleteBookmark(id);

        // Sync removal
        await syncManager.enqueue('bookmark', 'delete', { id });

        eventBus.emit(Events.BOOKMARK_REMOVED, id);
    }
}

export const bookmarkService = BookmarkService.getInstance();
