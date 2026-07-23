import { AudioProvider, SearchOptions, ProviderCapabilities, ProviderInfo } from '../registry';
import { MediaItem, PlayableSource } from '../models';
import { globalCache } from '../../cache';
import { AudiobookProvider } from '../services/AudiobookDiscoveryService';
import { logger } from '../../logger';

export class LibriVoxProvider implements AudioProvider, AudiobookProvider {
    readonly id = 'librivox';
    readonly name = 'LibriVox';
    readonly supportedTypes = ['audiobook', 'chapter'];

    readonly capabilities: ProviderCapabilities = {
        search: true,
        recommendations: false,
        favorites: true,
        history: true,
        downloads: false,
        continueListening: true,
        streaming: true,
        live: false,
        lyrics: false,
        speedControl: true,
        authentication: false,
    };

    readonly info: ProviderInfo = {
        id: 'librivox',
        displayName: 'LibriVox Audiobooks',
        website: 'https://librivox.org/',
        supportsOffline: false,
        supportsStreaming: true,
    };

    private baseUrl = 'https://librivox.org/api/feed/audiobooks';

    async fetchApi(params: Record<string, string | number> = {}, subPath: string = ''): Promise<any> {
        const queryParams = new URLSearchParams();
        // LibriVox API usually returns XML by default, but we can request JSON via format=json
        queryParams.append('format', 'json');
        Object.entries(params).forEach(([key, value]) => {
            if (key !== 'subPath') {
                queryParams.append(key, String(value));
            }
        });

        const url = `${this.baseUrl}${subPath}?${queryParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`LibriVox API error: ${response.statusText}`);
        }
        return response.json();
    }

    async searchAudiobooks(
        query: string,
        options?: {
            language?: string;
            author?: string;
            title?: string;
            limit?: number;
            offset?: number;
        } | number
    ): Promise<MediaItem[]> {
        try {
            const queryParams: Record<string, string | number> = {};

            if (typeof options === 'number') {
                queryParams.limit = options;
            } else if (options) {
                if (options.limit !== undefined) queryParams.limit = options.limit;
                if (options.offset !== undefined) queryParams.offset = options.offset;
                if (options.language) queryParams.language = options.language.trim().toLowerCase();
                if (options.author) queryParams.author = options.author;
                if (options.title) queryParams.title = options.title;
            }

            // Fallback to query mapping if specific filters are not provided
            if (!queryParams.language && !queryParams.author && !queryParams.title && query) {
                const normalizedQuery = query.trim().toLowerCase();
                const SUPPORTED_LANGUAGES = ['telugu', 'hindi', 'english', 'tamil', 'punjabi', 'spanish', 'french', 'german', 'italian'];
                if (SUPPORTED_LANGUAGES.includes(normalizedQuery)) {
                    queryParams.language = normalizedQuery;
                } else {
                    queryParams.title = query;
                }
            }

            if (queryParams.limit === undefined) {
                queryParams.limit = 20;
            }

            const results = await this.fetchApi(queryParams);
            if (results && results.books) {
                return results.books.map((b: any) => this.mapBookToMediaItem(b));
            }
        } catch (e) {
            logger.warn(`LibriVox searchAudiobooks failed for query: "${query}"`, e);
        }
        return [];
    }

    async search(query: string, options?: SearchOptions): Promise<MediaItem[]> {
        try {
            const limit = options?.limit || 20;
            const offset = (options?.page || 0) * limit;

            return this.searchAudiobooks(query, {
                limit,
                offset
            });
        } catch (e) {
            logger.warn(`LibriVox search failed for query: "${query}"`, e);
        }

        return [];
    }

    async getMedia(id: string, type: string): Promise<MediaItem> {
        if (type !== 'audiobook' && type !== 'chapter') {
            throw new Error(`Type ${type} not supported by LibriVoxProvider`);
        }

        if (type === 'chapter') {
            // LibriVox API is mostly book-centric. Chapters are usually fetched via the book.
            // For a single chapter, we might need to fetch the book and find the chapter.
            // However, MediaItem for chapter usually contains enough info in metadata.
            throw new Error('Direct chapter fetching not implemented. Fetch via Audiobook.');
        }

        const result = await this.fetchApi({ id });
        if (!result.books || result.books.length === 0) {
            throw new Error('Audiobook not found');
        }
        return this.mapBookToMediaItem(result.books[0]);
    }

    async getRecommendations(_id: string): Promise<MediaItem[]> {
        return this.getPopular();
    }

    async getPlayableSource(id: string, _quality?: string): Promise<PlayableSource> {
        // In LibriVox, the ID for a chapter is usually its URL or a specific ID.
        // If id is a URL, use it directly.
        if (id.startsWith('http')) {
            return {
                url: id,
                format: 'mp3',
                mimeType: 'audio/mpeg'
            };
        }

        // Otherwise, we might need to fetch the book/chapter info
        throw new Error('Invalid LibriVox playable ID');
    }

    async getPopular(limit: number = 20): Promise<MediaItem[]> {
        const results = await this.fetchApi({
            limit,
            sort_order: 'desc',
            sort_key: 'usage_count' // Proxy for popular
        });
        return results.books?.map((b: any) => this.mapBookToMediaItem(b)) || [];
    }

    async getRecent(limit: number = 20): Promise<MediaItem[]> {
        const results = await this.fetchApi({
            limit,
            sort_order: 'desc',
            sort_key: 'release_date'
        });
        return results.books?.map((b: any) => this.mapBookToMediaItem(b)) || [];
    }

    async getChapters(bookId: string): Promise<MediaItem[]> {
        // LibriVox JSON API for books sometimes includes section info
        // but often we need to fetch the RSS feed or another endpoint for the actual MP3 list.
        // For this implementation, we will use a secondary "sections" query if available.
        // LibriVox API documentation suggests that 'id' query returns the book details.
        const result = await this.fetchApi({ id: bookId });
        const book = result.books?.[0];
        if (!book) return [];

        // LibriVox chapters are often in an 'sections' array if the right API is used
        // or we might need to parse the 'url_rss' or 'url_zip_file'? No, LibriVox has a sections feed.
        const sectionsResult = await fetch(`https://librivox.org/api/feed/sections?book_id=${bookId}&format=json`).then(res => res.json());

        return (sectionsResult.sections || []).map((s: any) => ({
            id: s.listen_url, // Use the URL as ID for direct playback
            provider: this.id,
            type: 'chapter',
            title: s.title || `Chapter ${s.section_number}`,
            subtitle: book.title,
            artwork: book.url_image ? [{ url: book.url_image }] : [],
            playable: true,
            duration: parseInt(s.playtime) || 0,
            stream: {
                url: s.listen_url,
                format: 'mp3'
            },
            metadata: {
                ...s,
                bookId: book.id,
                bookTitle: book.title
            }
        }));
    }

    private mapBookToMediaItem(b: any): MediaItem {
        return {
            id: String(b.id),
            provider: this.id,
            type: 'audiobook',
            title: b.title,
            subtitle: b.authors?.map((a: any) => `${a.first_name} ${a.last_name}`).join(', ') || 'Unknown Author',
            description: b.description,
            artwork: b.url_image ? [{ url: b.url_image }] : [],
            playable: false, // Books themselves aren't playable, their chapters are
            duration: parseInt(b.totaltimesecs) || 0,
            language: b.language,
            genres: b.genres?.map((g: any) => g.name) || [],
            metadata: {
                ...b,
                num_sections: b.num_sections,
                url_librivox: b.url_librivox,
                authors: b.authors
            }
        };
    }
}
