# Android media playback and calling device test matrix

Run these checks on physical devices before releasing a playback/calling reliability change. Browser emulation and a successful Gradle build do not validate Android audio focus, notification, Bluetooth routing, or OEM background restrictions.

## Playback matrix

| Scenario | Expected result | Record |
|---|---|---|
| Start music, lock screen for 10 minutes | Playback continues; media notification and controls remain available | Device / Android version / result |
| Switch between 3 apps while music plays | Playback continues without restarting the track | |
| Open Vibe On in a second browser tab (web) | Only one tab plays audio | Browser / result |
| Receive a cellular call while music plays | Music pauses or ducks according to Android focus; no stuck silent-playing UI | |
| End cellular call | Music resumes only when Android reports a transient focus gain and the user had not manually paused | |
| Disconnect Bluetooth headphones | Music pauses; it must not unexpectedly jump to speaker | |
| Reconnect Bluetooth headphones | Playback remains paused until expected user/system action | |
| Toggle speaker/earpiece during a call | Audio routes to selected device; music focus is not abandoned | |
| Temporarily disable network during a stream | Useful error/recovery behavior; no infinite retry loop | |
| Play a downloaded song in airplane mode | Offline audio plays from local storage | |
| Force-stop the app | Document that active WebView playback/calls end; no false promise of recovery | |

## Native Android playback backend

Android app playback is now routed through AndroidX Media3:

- `VibeOnPlaybackService` owns ExoPlayer and a MediaSessionService. The WebView sends commands through the Capacitor `VibeOnPlayback` bridge; the decoder and media session live in the Android service.
- Media3 owns Android media audio focus, noisy-route handling, playback notification, lock-screen play/pause/seek, playback speed, and output volume.
- HLS playback is enabled. Offline IndexedDB Blob tracks are transferred to an app-cache file before ExoPlayer loads them.
- Web builds continue to use the existing dual HTMLAudio/Web Audio engine.

**Known native parity work still outstanding:** Web Audio equalizer, software volume boost, live waveform visualizer, gapless preloading/crossfade, and queue-aware next/previous actions in the Android media notification have not yet been ported to Media3. Native queue advancement is coordinated by the React app while its process is alive. Treat this as an engine migration in progress, not full feature parity.

## Device coverage

- At least one Android 12/13 device and one Android 14/15/16 device.
- Include one device with aggressive OEM battery management if available.
- Test Bluetooth earbuds and built-in speaker/earpiece.
- Repeat with battery saver enabled and with the app backgrounded for several minutes.

## Evidence to capture

Record device model, Android version, app build, steps, expected/actual result, and a short screen recording for failures. Do not treat an emulator pass as a physical-device pass.
