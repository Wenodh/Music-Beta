# Vibe On — User Guide 🎧

Welcome to **Vibe On**, a premium, high-fidelity music experience designed for discovery and immersive listening. This guide explains how to use the application and make the absolute most of its premium features.

---

## ✨ Available Core Features

### 1. 3D Music Discovery
Navigate to the **Explore** page to discover new tracks using an interactive, gesture-driven card stack:
* **Swipe Right**: Play the current track immediately and add it to your queue.
* **Swipe Left**: Skip the current recommendation and show the next card.
* **Double Click Artwork**: Fast-seek forwards or backwards by double-clicking the left or right side of the cover image.

### 2. Apple Music-Style Synced Lyrics
Experience lyrics like never before:
* Tap the **Lyrics icon** on the player overlay while playing a song.
* Highly animated lyrics will scroll dynamically in time with the music.
* Tap any line of the lyrics to immediately skip playback to that specific part of the song.

### 3. Pro 10-Band Equalizer
Customize your sound to match your acoustic gear:
* Access the Equalizer from the player options menu.
* Activate/Deactivate the equalizer or choose from custom, pro-grade presets (e.g., Bass Boost, Acoustic, Rock, Classical).
* Fine-tune specific frequency sliders from 32 Hz up to 16 kHz to craft your own custom sound signature.

### 4. Real-Time Group Sessions
Listen to music in sync with friends, no matter where they are:
* **Create a Room**: Open the Group Session menu to start a session. You will be assigned a unique, shareable room code.
* **Join a Room**: Enter a shared code to connect to a friend's active session.
* **Synchronized Playback**: The Host manages track selection, playback state (Play/Pause), and seeking; all changes are updated instantly on guests' devices.
* **Floating Reactions**: Send real-time emojis (thumbs up, heart, fire, etc.) that float up on everyone's screen simultaneously with sender names.

### 5. High-Fidelity Audio Visualizers
Bring your music to life visually with five custom canvas-based visualizers:
* Choose between **Bars**, **Waveform**, **Particles**, **Circular**, and **Pixel** grid visualizers.
* Access and switch modes instantly from the player menu to match your current music vibe.

---

## 🎨 Interface Personalization

### Dynamic Themes
Vibe On utilizes a state-of-the-art **Dynamic Theme Engine**. The primary interface accents and background gradients automatically adapt to match the color palette of the current track's album art.

### OLED Dark Mode
Save battery and reduce eye strain on OLED screens by enabling **OLED Mode** in your settings. This switches background layouts to deep, pure black while keeping clean dynamic accents.

---

## 💾 Offline Downloads & Cloud Sync

### Caching and Downloads
Enjoy your music without worrying about cell coverage or data caps:
* Tap **Download Song** in the options menu to save a track offline.
* Saved tracks (both audio and artwork images) are cached locally using IndexedDB and remain accessible in your Library when offline.

### Cloud Library Sync
By signing in with your **Google Account**, your settings, favorite songs, and custom playlists are backed up securely using Supabase and synced automatically across all your devices.

---

## 🔮 Future Feature Roadmap

To ensure transparency, the following features are actively planned and currently in development:
* **Podcasts**: Structured episode playlists, play speed controllers, and subscription feeds.
* **Audiobooks**: Playback bookmark tracking, custom section sleep timers, and LibriVox catalog integrations.
* **Live Radio**: Directory of international streaming stations with tag filters.
* **Social Sharing**: Public profiles, user activity feeds, and shared collaborative playlists.

---

## ❓ Troubleshooting Common Issues

**The audio is stuttering or failing to load.**
* Try adjusting your **Preferred Quality** in the Settings menu (e.g., switching from 320kbps to 160kbps or lower for slower internet connections).
* If offline, verify that the song has been fully downloaded and exists in your Library under the Offline section.

**Google Sign-In is not redirecting back to the app on Android.**
* Ensure that you have registered your SHA-1 key in both Google Cloud Console and the Supabase settings dashboard.
* Verify your device is connected to the internet and matches the official app package name (`com.wenodh.vibeon`).
