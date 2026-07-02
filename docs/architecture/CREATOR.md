# Creator Studio Architecture

The Creator Studio provides a suite of tools for artists, podcasters, and authors to manage and distribute their content on Vibe On.

## Core Services

### 1. Media Upload & Asset Management
- **MediaUploadService**: Handles the chunked upload of large audio files to Supabase Storage.
- **AssetManager**: Manages transcoding, artwork generation, and metadata extraction.

### 2. Content Distribution
- **PodcastService**: Tools for creating and managing podcast series and episodes.
- **RSSFeedService**: Generates and parses RSS feeds for external distribution.
- **AudiobookService**: Specialized workflow for multi-chapter audiobook publishing.

### 3. Community Engagement
- **CommentService**: Real-time comment threads on tracks and episodes.
- **ModerationService**: Automated and manual moderation tools for creators to manage their community.

### 4. Analytics
- **AnalyticsService**: Provides creators with insights into their audience, including listening trends, demographic data, and retention metrics.

## Publishing Flow

1. **Upload**: Creator uploads raw audio via `MediaUploadService`.
2. **Process**: `AssetManager` transcodes audio to optimized formats (MP3/AAC/HLS).
3. **Metadata**: Creator fills in title, description, and tags.
4. **Publish**: `PublishingService` makes the content live and optionally notifies followers.

## Security
Creators only have access to their own content via RLS policies on the `media_items` and `assets` tables. High-volume actions (like RSS parsing) are performed in background workers to maintain platform stability.
