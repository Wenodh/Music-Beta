# Vibe On Architecture

Vibe On is a modern, provider-agnostic audio streaming platform built with React, Redux, and Three.js.

## Core Design Principles

1. **Provider Agnosticism**: The UI and playback logic never depend on specific API implementations. Everything is abstracted through the `AudioProvider` interface.
2. **Offline-First**: All user actions are queued and synchronized. Media can be downloaded for offline use.
3. **Cross-Device Continuity**: Playback positions and user library state are synchronized across devices in real-time.
4. **Performance Driven**: GPU-accelerated rendering, lazy loading, and virtualization ensure a smooth experience on low-end hardware.

## Key Subsystems

- [Playback](./PLAYBACK.md)
- [Provider System](./PROVIDERS.md)
- [Search](./SEARCH.md)
- [Download Manager](./DOWNLOADS.md)
- [Sync Manager](./SYNC.md)
- [Storage & Persistence](./STORAGE.md)
- [Database Schema](./DATABASE.md)
- [AI & Recommendations](./AI.md)
- [Social & Community](./SOCIAL.md)
- [Platform Integrations](./PLATFORM.md)

## Data Flow

User Interaction -> Platform Command -> Service/Manager -> Provider/Storage -> Redux State -> UI Update

## Folder Structure

- `src/lib`: Core business logic and managers (The "Engine").
- `src/features`: Redux slices and feature-specific logic (Social, Sync).
- `src/components`: UI components organized by feature or common use.
- `src/pages`: Route-level components.
- `src/hooks`: Orchestration logic and state bridges.
- `src/utils`: Pure utility functions.
