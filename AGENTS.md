# Vibe On — AI Agent Instructions (AGENTS.md) 🤖

This document provides core instructions, principles, standards, and rules for AI coding agents working on the **Vibe On** project. You must read and strictly adhere to these guidelines to ensure the project remains high-performing, stable, and highly maintainable.

---

## 🎧 What is Vibe On?
**Vibe On** is a premium, high-fidelity music application designed for discovery and an immersive listening experience. It features a modern React 18, TypeScript, and Tailwind CSS frontend, styled with glassmorphism and animated with Framer Motion. The web application is compiled and wrapped for native mobile deployment on Android using **Capacitor v8**.

### Current Architecture Summary
Vibe On operates as a state-driven Single Page Application (SPA).
* **Audio Engine**: Powered by a dual-buffer system in the `Player.tsx` component using persistent HTML5 `Audio` elements (`audioRefA` and `audioRefB`) to support seamless gapless preloading and linear crossfading.
* **State Management**: Centralized using **Redux Toolkit** (using Thunks for async operations and Persist for IndexedDB/LocalStorage storage).
* **Backend Integration**: Leverages **Supabase** for Google OAuth, database persistence of favorites/playlists, and real-time Group Sessions (using Supabase Presence & Broadcast channels).
* **Database & Caching**: Employs browser **IndexedDB** for caching audio files and album artwork blobs to support offline playback.
* **Provider System**: Currently integrated with a JioSaavn API provider for searching, recommendations, and playing back music.

---

## 🗂️ Directory Structure & Boundaries

* **`/src`**: Root of the React frontend application source code.
  * **`components/`**: Modular UI components (Player, Visualizers, Equalizer, Modals, etc.).
  * **`features/`**: Redux state slices containing reducers, actions, and thunks for state management (auth, library, settings, music player, session, ui).
  * **`hooks/`**: Custom React hooks (e.g., `useFetchDetails` for suggestions, `useSession` for real-time collaboration).
  * **`pages/`**: Primary page routes (Home, Explore, Library, Search, etc.).
  * **`utils/`**: Shared helper functions (caching, color extraction, lyrics parsing, IndexedDB database helpers).
  * **`types/`**: Application type safety and interfaces.
* **`/docs`**: Official documentation folder.
* **`/android`**: Native Capacitor Android project files (manifests, gradle build scripts, splash screens).
* **`/public`**: Static assets, PWA icons, and third-party resources.

---

## ⚙️ Key Systems: Actual vs. Planned Architecture

To keep documentation clean and avoid confusion, the following lists existing architectures vs. planned enterprise guidelines:

### 1. Audio SDK & Providers
* **Current Implementation**: Features are retrieved from the JioSaavn API service (`jiosaavn-api-cyan-theta.vercel.app` defined in `src/constants.app`) and dynamically mapped to the standard `Song` type interface.
* **Planned Future Concept**: Modularized `AudioSDK` with standard registries (`ProviderRegistry`, `ProviderAdapter`) to easily plug in multiple providers (e.g. LibriVox, Radio-Browser, Podcast Index) under standard contracts.

### 2. Playback Management
* **Current Implementation**: Playback is managed by the Redux slice `musicPlayerSlice` alongside the `Player.tsx` dual-buffer HTML5 Audio engine.
* **Planned Future Concept**: Transitioning to a dedicated `PlaybackManager` singleton orchestrating multiple low-level audio engines (e.g., NativeAudioEngine, HLSAudioEngine).

### 3. Synchronization & Persistence
* **Current Implementation**: Cloud state (such as favorites) is synchronized on-demand via direct Supabase client updates (`supabase.ts` and `libraryActions.ts`). Redux state persistence is handled via `redux-persist`.
* **Planned Future Concept**: An offline-first operational log and dedicated `SyncManager` queue for deterministic conflict resolution and automated background syncing.

### 4. Download & Storage Management
* **Current Implementation**: IndexedDB-backed storage helper (`src/utils/db.ts`) exposes direct promises for saving, reading, and calculating storage information of audio and image blobs.
* **Planned Future Concept**: A unified `DownloadManager` system that automates queue scheduling, network tracking (WiFi-only downloads), and lifecycle events.

### 5. Platform Integration
* **Current Implementation**: App integrates native back button actions, Capacitor App-exit events, and browser MediaSession API directly inside components (`App.tsx`, `Player.tsx`).
* **Planned Future Concept**: A centralized `PlatformIntegrationManager` separating native/web capabilities via clean adapter contracts.

---

## 🎨 Coding & Architectural Conventions

1. **Structured Logging**: Use the internal console logging pattern or structured debug layers. Avoid leaving raw console calls in production code.
2. **Type Safety**: Strictly write type-safe TypeScript. Avoid the `any` keyword unless absolutely necessary for external interface mapping.
3. **No Unnecessary Rewrites**: Do not rewrite existing components. Inspect implementation, modify specifically, and maintain the existing structure unless a severe architectural design flaw is found.
4. **State Flow**: Components must interact with state strictly via Redux actions/selectors or custom hooks. Do not bypass Redux for global states.

---

## 🧪 Testing & Verification Expectations

* **Build Validation**: Always verify that the React source code compiles successfully without compilation errors by running `npm run build`.
* **Linting & Code Quality**: Run `npm run lint` to enforce ESLint standards. Do not ignore rules; correct formatting/syntax errors instead of disabling warnings.
* **Playwright Tests**: The project utilizes Playwright for verification of UI components and responsive layout spacing (under `verify_dynamic_spacing.spec.ts`). Ensure any layout-affecting changes do not break mobile responsiveness (320px–412px viewports).

---

## 🛠️ Important AI Agent Maintenance Rules

All AI agents working on this project **must** adhere to the following rules:

1. **Read Before Writing**: You must read `AGENTS.md` and the corresponding sections in `docs/DEVELOPER_GUIDE.md` before making any architectural or structural changes to the codebase.
2. **Inspect Existing Implementations**: Before introducing a new utility, pattern, or abstraction layer, inspect the current codebase first to avoid duplicating functionality or creating contradictory helpers.
3. **Keep Documentations Synchronized**: You must treat documentation maintenance as a required part of completing any significant code change.
   * If user-facing features or behavior changes, update `docs/USER_GUIDE.md`.
   * If development setups, database tables, build configurations, or technical architectures change, update `docs/DEVELOPER_GUIDE.md`.
   * If workflow conventions, architectural principles, directory guidelines, or rules change, update `AGENTS.md`.
4. **No Unneeded Documents**: Prefer editing the existing canonical files over creating new documentation files. Only create separate sub-documents under `/docs` if there is a distinct, justified reason.
5. **Preserve Integrity**: Prefer small, focused, non-breaking modifications. Keep existing code structure unless specifically directed otherwise by the user.
