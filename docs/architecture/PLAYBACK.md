# Playback Architecture

Vibe On uses a multi-engine playback architecture managed by a central `PlaybackManager`.

## Subsystems

### PlaybackManager
The singleton orchestrator that handles:
- Audio engine switching (Native vs HLS vs Remote)
- Crossfading between tracks
- Global playback state and events
- Media Session integration
- Volume and playback speed

### Audio Engines
All engines implement the `PlaybackEngine` interface:
- **NativeAudioEngine**: Standard HTML5 Audio for MP3/AAC.
- **HLSAudioEngine**: Uses `hls.js` for HLS/M3U8 streams (Radio/Live).
- **RemotePlaybackEngine**: Bridge for external devices (Cast/AirPlay).

### PreloadManager
Handles background pre-buffering of the next track in the queue to ensure gapless transitions.

## Data Flow
1. User clicks "Play" -> `PlaybackManager.play(item)`
2. `PlaybackManager` selects correct engine based on format.
3. Engine loads URL and emits events (buffering, playing, progress).
4. `PlaybackManager` relays events via `EventBus`.
5. UI components (Player, Visualizers) subscribe to `EventBus` for updates.

## Performance & Gapless
- **Buffer Swapping**: Two local engines (A & B) allow loading the next track while the current one is still playing.
- **Crossfading**: Linear volume interpolation between Engine A and B.
- **Preloading**: `PreloadManager` starts a hidden load of the next track when the current one is nearing its end.
