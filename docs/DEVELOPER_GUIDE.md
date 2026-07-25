# Vibe On — Canonical Developer Guide 🛠️

Welcome to the **Vibe On** Canonical Developer Guide. This document serves as the single, comprehensive technical reference for working with the Vibe On project. It details local development setups, the directory structure, the technical architecture, and guides on workflows, optimizations, and troubleshooting.

---

## 🏗️ Technical Architecture Overview

Vibe On is a high-performance, hybrid single-page application built on a modern web stack and wrapped for native mobile platforms using Capacitor.

```
       ┌────────────────────────────────────────────────────────┐
       │                       UI Layer                         │
       │     React 18 / Tailwind CSS / Framer Motion Pages      │
       └───────────────┬────────────────────────┬───────────────┘
                       │                        │
                       ▼                        ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │   Redux Store State    │◄────►│   Group Session Hook   │
       │ (musicPlayer, library) │      │      (useSession)      │
       └───────────────┬────────┘      └────────┬───────────────┘
                       │                        │
                       ▼                        ▼
       ┌────────────────────────┐      ┌────────────────────────┐
       │     Dual-Buffer        │      │    Supabase Client     │
       │   HTML5 Audio Engine   │      │ (OAuth / Realtime / DB)│
       └───────────────┬────────┘      └────────────────────────┘
                       │
                       ▼
       ┌────────────────────────┐
       │    Browser IndexedDB   │
       │ (Offline song caching) │
       └────────────────────────┘
```

### Core Architecture Components (Actual vs. Future)

To assist developers, we separate features currently implemented in the codebase from those planned for subsequent updates:

#### 1. Audio Engines & Playback (Actual: Dual-Buffer Player)
* **Implemented (Current)**: Managed by Redux state (`musicPlayerSlice.ts`) coupled with `Player.tsx`. It implements a dual-buffer system utilizing two persistent HTML5 `Audio` elements (`audioRefA` and `audioRefB`). This supports gapless audio preloading of the next track when the current one reaches 80% or has <30s remaining, and crossfading transitions with adjustable durations.
* **Planned (Future)**: Migration to a standalone `PlaybackManager` singleton orchestrating multiple independent local audio engine abstractions (`NativeAudioEngine`, `HLSAudioEngine`) and remote casting platforms (`RemotePlaybackEngine`).

#### 2. Provider System (Actual: JioSaavn Service Integration)
* **Implemented (Current)**: Integrates the JioSaavn API provider for searching, music metadata, and retrieval of audio streams. API requests are directed via standard vercel-hosted backend proxies (`jiosaavn-api-cyan-theta.vercel.app` defined in `src/constants.ts`).
* **Planned (Future)**: A modular `AudioSDK` exposing unified contracts for plug-and-play providers (e.g. `LibriVoxProvider`, `RadioBrowserProvider`, `PodcastIndexProvider`) orchestrated by a centralized `ProviderRegistry`.

#### 3. Storage & Downloads (Actual: IndexedDB helpers)
* **Implemented (Current)**: Employs a promise-based client-side IndexedDB wrapper (`src/utils/db.ts`) with a database named `vibeon_offline` containing a `songs` store. Stores full raw audio and artwork cover images as binary blobs.
* **Planned (Future)**: A structured `DownloadManager` running download operations sequentially as queue items, utilizing concurrency throttles and checking hardware states (WiFi-only downloads).

#### 4. Device & Platform Bridge (Actual: Capacitor & MediaSession APIs)
* **Implemented (Current)**: Capacitor v8 wraps web builds into native Android components. It handles native physical back button routines, custom OAuth redirects, and application exit tasks inside `App.tsx`. Standard web browser `navigator.mediaSession` handles background OS notification controls and media states inside `Player.tsx`.
* **Planned (Future)**: Centralized `PlatformIntegrationManager` adapter orchestrating MediaSession, native notification interfaces, wearable endpoints, and deep-linking under single contracts.

#### 5. Sync & Collaboration (Actual: Realtime Session Channel)
* **Implemented (Current)**: State synchronization for Group Sessions leverages Supabase Broadcast and Presence channels (`useSession.ts`). The host broadcasts play, pause, seek, and emoji reactions. Shared favorites are synchronized on-demand via direct queries inside `libraryActions.ts`.
* **Planned (Future)**: A local `SyncManager` queue persisting actions as immutable `SyncOperation` instances, replaying logs against Supabase databases with version-based conflict resolution.

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js**: v22.0.0 or higher.
* **Java Development Kit (JDK)**: JDK 21 (required for Capacitor Android builds).
* **Android Studio**: Installed with SDK platforms and virtual emulators (for Android development).

### Setup Steps
1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Environment Variables**:
   Create a `.env` file in the root repository folder:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
4. **Build Production Assets**:
   ```bash
   npm run build
   ```

---

## 📱 Android Build & Google OAuth Setup

Vibe On uses Capacitor to bridge and build native Android packages. In addition, user registration via Google OAuth requires exact fingerprint mappings.

### Native Android Compilation
1. Compile the React assets:
   ```bash
   npm run build
   ```
2. Sync the compiled build assets with Capacitor:
   ```bash
   npx cap sync android
   ```
3. Open the Android project in Android Studio for debugging or signing:
   ```bash
   npx cap open android
   ```

### Google OAuth Android Integration

To enable Google OAuth redirection on Android, you must configure SHA-1 fingerprints in both the Google Cloud Console and the Supabase Dashboard.

#### 1. Obtain SHA-1 Fingerprints
* **Debug Fingerprint**: Run inside the `android/` directory:
  ```bash
  ./gradlew signingReport
  ```
  Locate the `SHA1` string under `Variant: debug`.
* **Release Fingerprint**: For signed release keys:
  ```bash
  keytool -list -v -keystore your-release-key.keystore
  ```

#### 2. Google Cloud Console Configuration
1. Access the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Vibe On cloud project.
3. Go to **APIs & Services > Credentials**.
4. Select **Create Credentials > OAuth client ID**.
5. Choose **Android** as the application type.
6. Input the **Package Name**: `com.wenodh.vibeon`.
7. Paste the **SHA-1 certificate fingerprint**.
8. Repeat for both debug and release certificate fingerprints.

#### 3. Supabase Dashboard Configuration
1. Open your project on the [Supabase Dashboard](https://supabase.com/).
2. Go to **Authentication > Providers > Google** and ensure Google Auth is active.
3. Under **Authentication > Settings > Redirect URLs**, register the Android redirect deep link scheme:
   ```text
   com.wenodh.vibeon://login
   ```

#### 4. Native App Deep Link Handling
Deep linking rules are configured inside `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.wenodh.vibeon" />
</intent-filter>
```

---

## 🗂️ Project Structure

The codebase directory layout is structured as follows:

```text
├── android/                    # Capacitor Native Android Android Studio Project
├── assets/                     # Native Splash Screens & Launcher Icons
├── docs/                       # Official Guides & Audit Reports
│   ├── audits/                 # Current Performance Audits
│   ├── USER_GUIDE.md           # End-User Guide
│   └── DEVELOPER_GUIDE.md      # Developer Technical Reference (This File)
├── public/                     # Static Client Resources & PWA Icons
├── src/                        # React Application Source
│   ├── components/             # Reusable UI Elements, Overlays, Modals
│   │   ├── globe/              # SongGlobe WebGL components
│   │   └── toast/              # Custom floating toast notifications
│   ├── constants/              # Fixed configuration maps (Equalizer presets)
│   ├── features/               # Redux State Management Slices
│   │   ├── auth/               # User session actions & slices
│   │   ├── library/            # Saved songs, local playlists, sync thunks
│   │   ├── musicplayer/        # Dual-buffer playback state & queue logic
│   │   ├── session/            # Group Session parameters & real-time reactions
│   │   └── ui/                 # Dynamic theme, modals, drawer controls
│   ├── hooks/                  # React Hooks (useSession, useFetchDetails)
│   ├── pages/                  # Top-level Router Page components
│   ├── types/                  # TypeScript interface definitions (music.ts)
│   ├── utils/                  # Utility helpers (IndexedDB db.ts, lyrics parser)
│   ├── App.tsx                 # App Router, Layout containers, Lifecycle boots
│   ├── main.tsx                # Client Entrypoint (Hydrates Redux store & Dom)
│   ├── persistConfig.ts        # Redux Persist storage schema mappings
│   └── store.ts                # Primary Redux Store setup
├── AGENTS.md                   # AI Coding Agent Instructions
├── package.json                # Project dependencies and script runner hooks
├── tailwind.config.js          # Tailwind CSS style utilities
└── vite.config.ts              # Vite bundling, PWA caching, and compile tasks
```

---

## 🗄️ Redux & State Management

Application state is synchronized globally across the following Redux Toolkit slices under `/src/features`:

* **`auth`**: Handles OAuth access tokens, session details, and account profiles.
* **`musicPlayer`**: Coordinates current tracks, playback queues, volume multipliers, gapless caching, repeat types, shuffling, search suggestions, and active visualizer themes.
* **`library`**: Handles personal playlists and saved favorite catalogs. Synchronizes favorite operations directly with Supabase remote collections.
* **`session`**: Tracks real-time active users in the Group Session room, Host controls, and real-time floating emojis.
* **`ui`**: Stores modal visibility states (playlist addition, equalizer modal), active OLED modes, and current dynamic album accent colors.

**Persistence**: Configured via `redux-persist` (in `src/persistConfig.ts`). Sensitive user options, playlist structures, and custom equalizer maps are stored in local storage and rehydrated during app boots.

---

## ⚡ Performance & Responsiveness Guidelines

### 1. Request Cancellation & Debouncing
* **Search Debouncing**: The Search query bar input features a stable 300ms debouncing window implemented using stable React refs (`useMemo` combined with callbacks) inside `Navbar.tsx`.
* **Concurrences & Aborts**: All heavy API fetching routines utilize `AbortController` cancellation tokens. When filters (such as languages) are modified, or the user navigates away, the active requests are aborted via `.abort()` and outstanding state lists are cleared. Aborted requests must be caught silently without emitting trace logs.

### 2. Viewport Spacing & Responsiveness
* **Narrow Screens (320px–390px)**: Elements inside `BottomBar.tsx` dynamically scale padding and font-sizes to prevent cluttering. `MobileNowPlaying.tsx` leverages responsive height adjustments to comfortably position sliders, visualizer grids, and track text on shorter devices (like the iPhone SE).
* **Render Throttling**: Complex components like `FloatingEmoji` are memoized, and their visual position updates are calculated outside standard layout loops to prevent continuous reflow operations.

### 3. Canvas WebGL & Animation Optimization
* **Physics-based Animations**: Visualizers run calculation updates bounded directly inside the standard animation frames (`requestAnimationFrame`). Style variables are set using absolute properties to prevent layout recalculation storms.

---

## 🧪 Testing & Validation Workflows

To maintain extreme stability and avoid regressions, always run the following pre-flight check processes:

### Type Checking
```bash
npx tsc --noEmit
```

### Code Style Linting
```bash
npm run lint
```

### Production Bundling
Ensure the compilation assets generate optimized bundles successfully:
```bash
npm run build
```

---

## 🛠️ Development Workflows & Troubleshooting

### Adding a New Provider / Media Type (Planned Guideline)
When modularizing providers under the planned future `AudioSDK`:
1. Implement the generic `ProviderAdapter` class.
2. Define a type-safe parser matching the target media (Music, Podcast, Audiobook, or Live Radio) to the canonical `MediaItem` schema.
3. Register the new class inside the centralized `ProviderRegistry`.

### Offline Song Loading Not Working
* Verify if browser IndexedDB quotas are exhausted.
* Check if the client environment supports database instances by querying `indexedDB` existence.
* Run statistical calculation tests via `getDownloadStorageInfo()`.

### OAuth Deep Link Redirect Failures on Device
* Ensure your SHA-1 debug key matches the credentials configured inside Google Console.
* Confirm that `com.wenodh.vibeon://login` is registered inside Supabase's Redirect URI panel.
