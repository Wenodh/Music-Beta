# Platform Integrations Architecture

Vibe On uses a provider-agnostic platform layer to integrate with various OS-level features and external devices.

## Architecture: Adapter Pattern

The `PlatformIntegrationManager` orchestrates multiple `PlatformAdapter` implementations, each targeting a specific platform or feature set.

### Core Components

#### 1. PlatformIntegrationManager
The central registry for adapters. It aggregates capabilities and provides a unified interface for the rest of the application to interact with platform-specific features.

#### 2. CommandDispatcher
A centralized command bus that handles all playback and navigation actions (e.g., `PLAY`, `PAUSE`, `SKIP_NEXT`, `SEEK`).
- Sources: UI buttons, Keyboard shortcuts, Media Session (lock screen), Remote controls.
- Destination: `PlaybackManager` or relevant service.
- **Single Execution Path**: Ensures consistent behavior regardless of where the command originated.

#### 3. Platform Adapters
- **MediaSessionAdapter**: Integrates with the browser/native `MediaSession` API for lock screen controls and metadata.
- **CastAdapter**: Handles communication with Google Cast devices.
- **DeepLinkAdapter**: Manages incoming deep links (e.g., `vibeon://track/123`).
- **KeyboardAdapter**: Maps physical keyboard keys to commands.

## Discovery & Capabilities

The application dynamically adjusts its UI based on the capabilities reported by the active adapters:
- **`mediaSession`**: Enables background playback controls.
- **`cast`**: Shows the "Cast" icon in the player.
- **`wearable`**: Indicates support for synchronized smartwatches.

## Unified Dispatch Flow

1. **Input**: User presses the "Play" button on their physical keyboard.
2. **Detection**: `KeyboardAdapter` captures the event.
3. **Dispatch**: `KeyboardAdapter` calls `platformManager.dispatchCommand('PLAY')`.
4. **Execution**: `CommandDispatcher` receives the command and calls `playbackManager.play()`.
5. **Feedback**: `PlaybackManager` updates its state, and all UI/Platform observers are notified.
