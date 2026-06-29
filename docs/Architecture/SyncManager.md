# Sync Manager

The `SyncManager` ensures user state (favorites, history, positions, bookmarks) is consistent across all devices.

## Architecture: Sync Operation Queue

Vibe On uses an immutable operation-based sync strategy:

1. **Enqueue**: Every mutation (e.g., `Add Favorite`) is stored as a `SyncOperation` in a local IndexedDB table.
2. **Process**: The manager attempts to replay these operations to the Supabase backend.
3. **Retry**: Failed operations are retried with exponential backoff (max 3 retries).
4. **Pull**: On startup and periodically, the manager pulls the latest state from the cloud.

## Deterministic Conflict Resolution

| Entity | Strategy |
| --- | --- |
| **Favorites** | **Union**: Local and remote favorites are merged. Deletions use soft-delete flags. |
| **Playback Position** | **Version Wins**: The record with the highest version (or latest timestamp if versions tie) wins. |
| **History** | **Append/Deduplicate**: History entries are appended. Entries within a 30-minute window for the same media are deduplicated into a single session. |
| **Bookmarks** | **ID-based Merge**: Bookmarks are merged by their unique UUIDs. |

## Cross-Device Continuity (Continue Listening)

The system monitors remote playback positions. If a user starts playing a track that has a significantly newer position (>2 minutes or >5% further) on another device, the UI triggers a non-intrusive toast allowing the user to "Resume" from the synced position.
