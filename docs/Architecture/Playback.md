# Playback Architecture

Vibe On features a sophisticated playback system designed for stability and visualizer continuity.

## Core Component: `PlaybackManager`

The `PlaybackManager` is a singleton that orchestrates multiple audio engines.

### Audio Engines

1. **NativeAudioEngine**: Uses the browser's native `<audio>` tag for MP3 and AAC files.
2. **HLSAudioEngine**: Uses `hls.js` for HLS streams and Internet Radio.

### Visualizer Stability

To ensure the Web Audio API visualizer doesn't break when switching between media types (e.g., Music to Radio), the `PlaybackManager` maintains a persistent `AudioContext` and reuses `HTMLAudioElement` instances.

## Playback Policies

Each media type has a `PlaybackPolicy` that defines its behavior:

- **Music**: Supports seeking, skipping, and favorites.
- **Radio**: No seeking, supports live indicators.
- **Podcasts/Audiobooks**: Supports seeking, playback speed control, and resume position.

## Event Communication

The system broadcasts its state via the `eventBus`:
- `playback:started`
- `playback:progress`
- `playback:ended`
- `playback:error`
- `playback:metadata:update` (for live radio track names)
