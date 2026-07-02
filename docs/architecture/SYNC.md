# Sync Architecture

The Sync system ensures a consistent experience across all user devices by synchronizing library state, playback positions, and social activity.

## Architecture: Hybrid Conflict Resolution

Vibe On uses different sync strategies depending on the data type:

### 1. Last-Write-Wins (LWW) with Versioning
Used for **Playback Positions** and **User Profiles**.
- Each record has a `version` and `updated_at`.
- When syncing, the record with the highest version (or latest timestamp if versions match) wins.

### 2. Additive (Append-Only)
Used for **History**.
- New history items are always appended.
- Deduplication happens on the client-side during rendering (within a 30-minute window).

### 3. State-Based (Union)
Used for **Favorites** and **Bookmarks**.
- Favorites are merged. If a track is favorited on Device A and Device B, it remains favorited.

### 4. Operation-Based (CRDT-Lite)
Used for **Collaborative Playlists**.
- Instead of syncing the entire playlist state, the app syncs immutable "operations" (e.g., `ADD_TRACK`, `REMOVE_TRACK`, `REORDER`).
- Operations are replayed deterministically on each client to arrive at the same final state.

## Subsystems

### SyncManager
The orchestrator that:
- Maintains a local **Pending Operations Queue** in IndexedDB.
- Listens for network availability to trigger background sync.
- Processes the queue by replaying operations against the Supabase backend.
- Pulls latest changes from the server and broadcasts them via the `EventBus`.

### Device Discovery
Assigns a unique `deviceId` to each installation, allowing the server to track where updates originated and prevent unnecessary echo-syncs.

### Active Sessions
Monitors which device is currently active. If playback starts on Device B, Device A receives a notification and automatically pauses.

## Data Flow (Offline-to-Online)
1. **Offline**: User favorites a song.
2. **Queue**: `SyncManager` enqueues a `create` operation for `favorite` in IndexedDB.
3. **Online**: `window.onLine` event fires.
4. **Processing**: `SyncManager` reads the queue, sends the operation to Supabase via `upsert`.
5. **Cleanup**: On success, the operation is removed from the local queue.
