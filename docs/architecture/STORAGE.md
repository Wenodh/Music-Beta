# Storage Architecture

Vibe On uses a multi-tiered storage strategy to balance performance, persistence, and offline capabilities.

## Storage Tiers

### 1. Redux (Memory)
- **Use Case**: Active application state (current track, playback queue, UI theme).
- **Persistence**: Select slices are persisted to `localStorage` via `redux-persist` to survive page reloads.
- **Limit**: ~5MB (browser limit for localStorage).

### 2. IndexedDB (Local Database)
- **Implementation**: Managed via `Dexie.js` in `StorageService.ts`.
- **Use Case**: Large datasets and binary data.
    - **Downloads**: Media Blobs (MP3/AAC) and metadata.
    - **Sync Queue**: Pending operations to be sent to the server.
    - **Cache**: Cached API responses for offline search and discovery.
- **Limit**: Significant (typically 50% of free disk space).

### 3. Supabase (Cloud)
- **Use Case**: Source of truth for user library, playlists, and social data.
- **Sync**: `SyncManager` orchestrates the movement of data between IndexedDB and Supabase.

## Database Schema (IndexedDB)

| Table | Primary Key | Description |
| :--- | :--- | :--- |
| `downloads` | `id` | Stores media blobs and associated metadata. |
| `syncQueue` | `id` | FIFO queue for offline operations. |
| `keyValue` | `key` | General purpose settings and flags. |

## Data Integrity & Security

- **MIME Validation**: `DownloadManager` verifies file types before saving to IndexedDB.
- **Quota Management**: `StorageService.getStorageUsage()` is called before new downloads to enforce a 2GB default limit.
- **Privacy**: sensitive data (like auth tokens) is managed by Supabase Auth and never stored directly in the application's IndexedDB tables.
