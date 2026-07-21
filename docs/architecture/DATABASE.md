# Database Schema (Supabase)

Vibe On uses Supabase (PostgreSQL) for its backend, leveraging Row Level Security (RLS) for data privacy.

## Core Tables

### Profiles
Extends Supabase Auth users with application-specific metadata.
- `id` (uuid, PK): Matches `auth.users.id`.
- `display_name` (text).
- `avatar_url` (text).
- `bio` (text).
- `preferences` (jsonb).

### Favorites
Stores user-bookmarked tracks, albums, and artists.
- `id` (uuid, PK).
- `user_id` (uuid, FK).
- `media_id` (text).
- `provider` (text).
- `content_type` (text).

### History
Playback history for analytics and "Recently Played".
- `id` (uuid, PK).
- `user_id` (uuid, FK).
- `media_id` (text).
- `provider` (text).
- `played_at` (timestamp).
- `listened_duration` (int).

### Playlists & Playlist Members
Collaborative and private playlist management.
- `playlists`: `id`, `owner_id`, `title`, `is_public`.
- `playlist_members`: `playlist_id`, `user_id`, `role` (owner, editor, viewer).
- `playlist_operations`: Immutable log of mutations for operation-based sync.

### Active Sessions
Cross-device playback continuity.
- `user_id` (uuid, PK).
- `device_id` (text).
- `status` (text).
- `media_id` (text).
- `position` (float).

## Row Level Security (RLS)

All tables enforce RLS:
- **Private Data**: `user_id = auth.uid()` ensures users can only read/write their own favorites, history, and settings.
- **Social Data**: Profiles are publicly readable. Follow relationships are managed via a dedicated `follows` table.
- **Collaborative Data**: Playlist access is controlled by the `playlist_members` table.
