import { BookMetadataProvider, BookMetadata } from '../services/AudiobookDiscoveryService';
import { logger } from '../../logger';

export class OpenLibraryProvider implements BookMetadataProvider {
    readonly id = 'open-library';

    async searchBooks(query: string, limit: number = 20): Promise<BookMetadata[]> {
        try {
            const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Open Library API error: ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.docs) return [];

            return data.docs.map((doc: any) => ({
                title: doc.title,
                authors: doc.author_name || [],
                description: doc.first_sentence ? doc.first_sentence.join(' ') : undefined,
                coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
                publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                language: doc.language ? doc.language[0] : undefined,
                subjects: doc.subject || []
            }));
        } catch (error) {
            logger.error('OpenLibraryProvider error searching books:', error);
            return [];
        }
    }
}
