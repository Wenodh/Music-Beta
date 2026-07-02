# Download Architecture

The Download system enables offline listening by storing media content locally in IndexedDB.

## Flow

1. **Start Download**: UI calls `downloadManager.startDownload(mediaItem)`.
2. **Queuing**: Task is added to the `DownloadManager` queue with status `queued`.
3. **Execution**: `processQueue` selects tasks (up to `maxConcurrentDownloads`).
4. **Fetch**: `DownloadManager` fetches the playable URL from the provider and streams the content.
5. **Validation**: verifies file size and MIME type.
6. **Storage**: Content is saved as a Blob in IndexedDB via `StorageService`.
7. **Events**: `DOWNLOAD_PROGRESS` events are emitted throughout the lifecycle.

## Subsystems

### DownloadManager
The central controller that manages the task queue, concurrency, and retries.

### StorageService
The abstraction layer for IndexedDB (via Dexie). It handles the actual persistence of Blobs and metadata.

### Policy Manager
Enforces user-defined constraints like "WiFi Only" and storage quotas (default 2GB).

## Offline Playback
When a user attempts to play an item that is downloaded:
1. `PlaybackManager` (or the specific engine) checks `StorageService` for a local copy.
2. If found, a `Blob URL` is created using `URL.createObjectURL(blob)`.
3. The audio engine plays the local Blob URL instead of the remote stream.

## Limitations
- **Browser Storage**: Subject to browser-specific storage quotas (often 50% of free disk space).
- **Blob URLs**: Must be revoked after use to prevent memory leaks.
- **Background Sync**: On web, downloads may be interrupted if the tab is closed or suspended.
