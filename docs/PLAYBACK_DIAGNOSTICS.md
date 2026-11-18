# Playback diagnostics

Vibe On keeps a bounded in-memory playback diagnostic history through `getPlaybackDiagnostics()` in `src/services/playbackDiagnostics.ts`.

- The buffer retains at most 100 recent stream-recovery events.
- Events include timestamps, song IDs, and HTML media error codes.
- Signed stream URLs and request headers are intentionally not recorded.
- Use `clearPlaybackDiagnostics()` when resetting a local debugging session.

This is a developer-facing diagnostic foundation, not a user-visible support panel. A future support UI should require explicit user action before sharing diagnostic data.
