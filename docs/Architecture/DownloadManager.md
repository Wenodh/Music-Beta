# Download Manager

The `DownloadManager` provides a provider-agnostic system for saving audio content for offline playback.

## Architecture

```
DownloadManager (Coordinator)
  ↓
StorageAdapter (Interface)
  ↓
IndexedDBAdapter (Dexie Implementation)
```

## Core Features

1. **Concurrency Control**: Defaults to 3 simultaneous downloads to balance performance and battery life.
2. **Storage Quota**: Enforces a 2GB default limit. Storage usage is calculated based on actual blob sizes.
3. **URL Refreshing**: If a download fails with a 403 error, the manager automatically calls the provider's `getPlayableSource` to get a fresh URL and retries.
4. **Resilience**: Downloads are persisted in IndexedDB and can resume (or retry) across application restarts.

## Download States

- `queued`
- `preparing`
- `downloading`
- `paused`
- `completed`
- `failed`
- `cancelled`

## Device Locality

Audio binaries are strictly device-local. Only the *metadata* about what is downloaded is eligible for cloud synchronization (for library filtering), but the actual files never leave the device.
