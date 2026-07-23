# Vibe On: Architecture Evolution & Implementation Plan
## Transforming Music Discovery into a Universal Audio Ecosystem

### 1. Executive Summary
Vibe On is evolving from a music-focused application into a comprehensive audio platform supporting **Podcasts, Audiobooks, and Live Radio**. The transition will follow a "Provider-Agnostic" philosophy, ensuring that new content sources (Spotify, Apple Music, RSS) can be added with zero changes to the core UI and Player logic.

Key pillars of this evolution:
- **Provider-Agnostic SDK:** A unified interface for fetching data from any audio source.
- **Unified Media Model:** Normalizing metadata across all content types.
- **Multimodal Playback Engine:** Support for MP3, HLS, and future third-party SDKs.
- **Universal Incremental Search:** Blazing fast discovery across all categories.
- **Cloud-Synced Continuity:** Cross-device resume playback for long-form content.

---

### 2. Current Architecture Analysis

| Category | Current State | Technical Debt / Bottleneck |
| :--- | :--- | :--- |
| **API Layer** | `musicApi.ts` calling JioSaavn directly. | Tightly coupled to one provider; hard to add others. |
| **Data Models** | `Song`, `Album` types are music-specific. | Metadata like "Episode", "Chapter", "Author" doesn't fit. |
| **Playback** | `useAudioPlayback.ts` uses `HTMLAudioElement` directly. | No HLS support; limited state management for live streams. |
| **Search** | Single-endpoint search; results arrive in one block. | Scale issues with multiple providers; slow perception. |
| **Database** | Supabase tables for `favorites` (songs) and `playlists`. | No tracking for playback position or long-form progress. |
| **UI** | Music-centric components (SongsList, AlbumItem). | Needs generalization for Podcasts/Radio. |

---

### 3. Proposed Folder Structure Changes
```text
src/
 ├── lib/
 │    └── audio-sdk/           <-- New: Provider abstraction layer
 │         ├── providers/      <-- Adapters for Music, Podcasts, Radio
 │         ├── registry.ts     <-- Dynamic provider loading
 │         └── index.ts        <-- Main interface for the app
 ├── lib/
 │    └── playback/            <-- New: Modular playback engines
 │         ├── PlaybackManager.ts
 │         ├── engines/        <-- Native, HLS, SDK engines
 │         └── types.ts
 ├── features/
 │    ├── playback/            <-- Migrated: musicPlayerSlice -> playbackSlice
 │    └── continuity/          <-- New: Resume playback logic
 ├── components/
 │    ├── media/               <-- Reusable: Generalizing SongItem -> MediaItem
 │    └── search/
 │         └── IncrementalSearch.tsx
```

---

### 4. Required Refactoring (SOLID Principles)

1. **Dependency Inversion:** Components will no longer import `musicApi`. They will import `AudioSDK` which interacts with interfaces, not implementations.
2. **Interface Segregation:** Split the massive `MusicPlayerState` into `PlaybackState` (what's playing) and `SessionState` (syncing/history).
3. **Open/Closed Principle:** Adding a new provider (e.g., YouTube Music) will only require adding a new class in `lib/audio-sdk/providers/` without touching `App.tsx`.

---

### 5. API Integration Strategy (The Provider Layer)

**Backend: Supabase Edge Functions**
- **Security:** API keys for Podcast Index and Radio Browser are stored in Supabase Secrets.
- **Aggregation:** Edge functions will handle initial filtering and normalization to reduce payload size.

**Frontend: AudioSDK**
- Implements a `searchAll(query)` method that returns an `Observable` or uses a callback for incremental updates.
- Uses `lru-cache` for sub-second repeat search performance.

---

### 6. Search Architecture
**Universal Incremental Search**
- **Flow:** `SearchInput` -> `AudioSDK.searchAll` -> `Parallel(Music, Podcast, Radio, Books)`.
- **UI:** Each section has its own `LoadingSkeleton`.
- **Priority:** Music results appear first, followed by others as they resolve.
- **Grouping:** Results remain strictly grouped by category (Songs, Podcasts, Radio Stations) for better scannability.

---

### 7. Performance & Optimization

- **Streaming Optimization:** Use `hls.js` buffer tuning for low-latency live radio.
- **Image Optimization:** Continue using the existing quality-based image selection but extend it to handle LibriVox and Podcast artwork.
- **Prefetching:** SDK will pre-fetch "Next Episode" metadata when a user is at >80% of a podcast episode.
- **Request Deduplication:** Use `AbortController` in the SDK to cancel stale searches.

---

### 8. UI/UX Improvements

- **Home Page:** Introduce a "Continue Listening" pill at the top for the last played long-form item.
- **Explore:** Tabbed interface: [Featured, Music, Podcasts, Audiobooks, Radio].
- **Library:** Add a "Type" filter (Pill style) at the top of the Favorites list.
- **Mobile/Tablet:** Use the existing `FlexLayout` and `Slider` components but with content-specific metadata (e.g., "30 mins left" instead of "Album Name").

---

### 9. Security, SEO & Accessibility

- **Security:** Secure stream URLs via signed tokens if providers support it.
- **SEO:** Dynamic meta tags for Podcast episodes and Audiobooks to improve discoverability on the web version.
- **Accessibility:** Ensure the unified player's speed controls and skip-back/forward buttons (essential for books) are fully screen-reader compatible.

---

### 10. Step-by-Step Implementation Roadmap

| Phase | PR Scope | Description | Effort |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundation** | Normalized types, PlaybackManager (HLS), Edge Function skeleton. | 8 Days |
| **Phase 2** | **Radio** | Radio Browser adapter, Live metadata UI, Radio Favorites. | 5 Days |
| **Phase 3** | **Podcasts** | Podcast Index adapter, Episode listings, Speed controls. | 7 Days |
| **Phase 4** | **Continuity** | `playback_positions` table, Sync logic, Continue Listening UI. | 4 Days |
| **Phase 5** | **Audiobooks** | LibriVox adapter, Chapter navigation, Bookmarks. | 6 Days |
| **Phase 6** | **Universal Search** | Incremental search UI, Search aggregation logic. | 4 Days |

---

### 11. Future Roadmap

- **AI Recommendations:** Use Supabase Vector (pgvector) to recommend Podcasts based on Music taste.
- **Offline Mode:** Extend the existing IndexedDB download logic to support Podcast episodes.
- **Cast/Auto:** Support for Chromecast, Android Auto, and CarPlay via Capacitor plugins.
- **Social:** Collaborative Podcast playlists and episode sharing.

---

### 12. Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Provider Downtime** | High | Implement fallback providers and clear "Offline/Unavailable" UI states. |
| **API Rate Limits** | Med | Aggressive caching in Supabase Edge Functions + CDN. |
| **Audiobooks Fragmented** | Med | Normalize LibriVox "Projects" into "Albums" and "Files" into "Chapters". |
| **HLS Compatibility** | Low | Polyfill with `hls.js` for non-Safari browsers. |
