import { MediaItem } from '../models';
import { logger } from '../../logger';

export interface BookMetadata {
    title: string;
    authors: string[];
    description?: string;
    coverUrl?: string;
    publishedDate?: string;
    language?: string;
    subjects?: string[];
}

export interface BookMetadataProvider {
    readonly id: string;
    searchBooks(query: string, limit?: number): Promise<BookMetadata[]>;
}

export interface AudiobookProvider {
    readonly id: string;
    searchAudiobooks(
        query: string,
        options?: {
            language?: string;
            author?: string;
            title?: string;
            limit?: number;
            offset?: number;
        } | number
    ): Promise<MediaItem[]>;
}

export interface SimilarityThresholds {
    fuzzyTitleAuthorTitle: number;   // default 0.85
    fuzzyTitleAuthorAuthor: number;  // default 0.80
    titleOnly: number;               // default 0.90
}

export class AudiobookDiscoveryService {
    private static instance: AudiobookDiscoveryService;
    private metadataProviders: BookMetadataProvider[] = [];
    private audiobookProviders: AudiobookProvider[] = [];

    // Configurable thresholds for progressive matching
    private thresholds: SimilarityThresholds = {
        fuzzyTitleAuthorTitle: 0.85,
        fuzzyTitleAuthorAuthor: 0.80,
        titleOnly: 0.90
    };

    private constructor() {}

    public static getInstance(): AudiobookDiscoveryService {
        if (!AudiobookDiscoveryService.instance) {
            AudiobookDiscoveryService.instance = new AudiobookDiscoveryService();
        }
        return AudiobookDiscoveryService.instance;
    }

    public registerMetadataProvider(provider: BookMetadataProvider): void {
        this.metadataProviders.push(provider);
    }

    public registerAudiobookProvider(provider: AudiobookProvider): void {
        this.audiobookProviders.push(provider);
    }

    public clearProviders(): void {
        this.metadataProviders = [];
        this.audiobookProviders = [];
    }

    public getThresholds(): SimilarityThresholds {
        return { ...this.thresholds };
    }

    public setThresholds(thresholds: Partial<SimilarityThresholds>): void {
        this.thresholds = {
            ...this.thresholds,
            ...thresholds
        };
    }

    public normalizeString(text: string): string {
        if (!text) return '';
        // Remove subtitles (anything after a colon, semicolon, or dash)
        const primary = text.split(/[:;\-]/)[0];
        return primary
            .toLowerCase()
            // Remove punctuation except spaces
            .replace(/[^\w\s]/g, '')
            // Collapse whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    public getSimilarity(s1: string, s2: string): number {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        return (longer.length - this.editDistance(longer, shorter)) / longer.length;
    }

    private editDistance(s1: string, s2: string): number {
        const costs: number[] = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    public async searchAudiobooks(
        query: string,
        options?: { limit?: number; offset?: number; page?: number } | number
    ): Promise<MediaItem[]> {
        let limit = 20;
        let offset = 0;

        if (typeof options === 'number') {
            limit = options;
        } else if (options) {
            limit = options.limit ?? 20;
            if (options.offset !== undefined) {
                offset = options.offset;
            } else if (options.page !== undefined) {
                offset = options.page * limit;
            }
        }

        // Log starting counts of the pipeline
        logger.info(`[Audiobooks pipeline] Start Discovery with query: "${query}", limit: ${limit}, offset: ${offset}`);

        // 1. Fetch metadata from BookMetadataProviders
        const bookMetadataPromises = this.metadataProviders.map(p =>
            p.searchBooks(query, limit).catch(err => {
                logger.error(`Metadata provider ${p.id} search failed:`, err);
                return [] as BookMetadata[];
            })
        );
        const metadataResults = (await Promise.all(bookMetadataPromises)).flat();
        logger.info(`[Audiobooks pipeline] BookMetadataProviders returned ${metadataResults.length} books`);

        // 2. Fetch audiobooks from AudiobookProviders using language/category browse options
        const audiobookPromises = this.audiobookProviders.map(p =>
            p.searchAudiobooks(query, { limit, offset }).catch(err => {
                logger.error(`Audiobook provider ${p.id} search failed:`, err);
                return [] as MediaItem[];
            })
        );
        const audiobookResults = (await Promise.all(audiobookPromises)).flat();
        logger.info(`[Audiobooks pipeline] AudiobookProviders returned ${audiobookResults.length} audiobooks`);

        const matchedItems: MediaItem[] = [];

        // 3. Progressive matching strategy with configurable thresholds and wrong author rejection
        metadataResults.forEach(book => {
            const normalizedBookTitle = this.normalizeString(book.title);
            const bookAuthorsNormalized = book.authors.map(a => this.normalizeString(a));

            let bestMatch: MediaItem | null = null;
            let matchReason = '';

            // Find best matching audiobook from LibriVox / other audiobook providers
            for (const audiobook of audiobookResults) {
                const normalizedAudiobookTitle = this.normalizeString(audiobook.title);
                const audiobookAuthorNormalized = this.normalizeString(audiobook.subtitle || '');

                // Option A: Exact title + author (normalized)
                const authorMatchesExact = bookAuthorsNormalized.some(ba =>
                    ba === audiobookAuthorNormalized ||
                    audiobookAuthorNormalized.includes(ba) ||
                    ba.includes(audiobookAuthorNormalized)
                );

                if (normalizedBookTitle === normalizedAudiobookTitle && authorMatchesExact) {
                    bestMatch = audiobook;
                    matchReason = 'exact_title_author';
                    break;
                }

                // Option B: Fuzzy title + author
                const titleSimilarity = this.getSimilarity(normalizedBookTitle, normalizedAudiobookTitle);
                const authorMatchesFuzzy = bookAuthorsNormalized.some(ba =>
                    this.getSimilarity(ba, audiobookAuthorNormalized) > this.thresholds.fuzzyTitleAuthorAuthor ||
                    audiobookAuthorNormalized.includes(ba) ||
                    ba.includes(audiobookAuthorNormalized)
                );

                if (titleSimilarity > this.thresholds.fuzzyTitleAuthorTitle && authorMatchesFuzzy) {
                    if (!bestMatch || titleSimilarity > this.getSimilarity(normalizedBookTitle, this.normalizeString(bestMatch.title))) {
                        bestMatch = audiobook;
                        matchReason = 'fuzzy_title_author';
                    }
                }

                // Option C: Title only (high similarity threshold) with wrong author rejection
                if (titleSimilarity > this.thresholds.titleOnly) {
                    // Reject if author metadata exists in both and is completely different (wrong author rejection)
                    const hasDifferentAuthors = bookAuthorsNormalized.length > 0 && audiobookAuthorNormalized.length > 0 &&
                        !bookAuthorsNormalized.some(ba =>
                            this.getSimilarity(ba, audiobookAuthorNormalized) > 0.5 ||
                            audiobookAuthorNormalized.includes(ba) ||
                            ba.includes(audiobookAuthorNormalized)
                        );

                    if (!hasDifferentAuthors) {
                        if (!bestMatch || titleSimilarity > this.getSimilarity(normalizedBookTitle, this.normalizeString(bestMatch.title))) {
                            bestMatch = audiobook;
                            matchReason = 'title_only';
                        }
                    } else {
                        logger.info(`[Audiobooks pipeline] Rejected title-only match for "${book.title}" because authors did not match ("${book.authors.join(', ')}" vs "${audiobook.subtitle}")`);
                    }
                }
            }

            if (bestMatch) {
                // Merge metadata: prioritize high-quality covers and details from Open Library
                const mergedItem: MediaItem = {
                    ...bestMatch,
                    // Use Open Library cover art if available as it is usually high quality, fallback to LibriVox image
                    artwork: book.coverUrl ? [{ url: book.coverUrl }] : bestMatch.artwork,
                    description: book.description || bestMatch.description,
                    metadata: {
                        ...bestMatch.metadata,
                        openLibraryBook: book,
                        matchReason
                    }
                };
                matchedItems.push(mergedItem);
            } else {
                logger.info(`[Audiobooks pipeline] Book "${book.title}" excluded because no matching playable audiobook was found in providers.`);
            }
        });

        logger.info(`[Audiobooks pipeline] Matched ${matchedItems.length} playables from ${metadataResults.length} metadata books`);

        // De-duplicate matched list to avoid duplicate entries of the same audiobook
        const seenIds = new Set<string>();
        const finalMatched = matchedItems.filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
        });

        logger.info(`[Audiobooks pipeline] Final returned ${finalMatched.length} audiobooks`);
        return finalMatched;
    }
}

export const audiobookDiscoveryService = AudiobookDiscoveryService.getInstance();
