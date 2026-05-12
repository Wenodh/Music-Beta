# VibeOn - Modern Music Experience

VibeOn is a high-performance, modern music streaming application designed for the web. Built with React, TypeScript, and Tailwind CSS, it offers a premium listening experience with a focus on speed, aesthetics, and advanced audio features.

Developed with ❤️ by **WENODH**.

---

## ✨ User Features

### 🎧 Immersive Playback
- **Gapless Playback & Crossfade**: Enjoy smooth transitions between tracks with adjustable crossfade duration (up to 12s).
- **10-Band Equalizer**: Fine-tune your audio with a professional-grade graphic equalizer and curated presets (Pop, Rock, Jazz, etc.).
- **Smart Queue**: Easily manage your upcoming tracks with drag-and-drop reordering and "Clear Queue" functionality.
- **Song Radio**: Automatically discover similar tracks based on your current playback.
- **Sleep Timer**: Fall asleep to your favorite tunes with a customizable countdown timer.

### 🔍 Discovery & Personalization
- **Dynamic Search**: Real-time results for songs, albums, artists, and playlists.
- **Daily Mix**: Personalized recommendations generated based on your listening history.
- **Artist Deep-Dive**: Explore artist biographies, top songs, and "Fans Also Like" suggestions.
- **Mood-based Playlists**: Discover music curated for different moods and activities.
- **Community Pulse**: A live feed of what others in the community are listening to.

### 🎨 Premium UI/UX
- **Glassmorphism Design**: A sleek, modern "frosted glass" aesthetic with fluid animations.
- **Dynamic Theme Engine**: The application's accent color automatically adapts to the artwork of the currently playing song.
- **OLED Mode**: A pure black theme option for battery savings on mobile devices and improved contrast.
- **Responsive & Mobile-First**: Fully optimized for Desktop, Tablet, and Mobile devices.
- **Progressive Web App (PWA)**: Install VibeOn on your device for a native-like app experience.

### 📁 Library & Social
- **Cloud Sync (Planned)**: Seamlessly sync your library across devices (currently using persistent local storage).
- **Personal Playlists**: Create, edit, and manage your own music collections.
- **High-Quality Downloads**: Download your favorite tracks for offline listening.
- **Web Share Integration**: Share your favorite songs, albums, or artists directly through system share dialogs.

---

## 🛠️ Technical Details

### Frontend Architecture
- **React 18**: Leveraging the latest features including Concurrent Mode and Suspense for code splitting.
- **TypeScript**: Full type safety across the application for robust development and maintenance.
- **Redux Toolkit**: Centralized state management for the player, library, UI, and settings.
- **Redux Persist**: Persistent storage of user preferences, recently played, and library data.
- **Framer Motion**: High-performance animations and layout transitions.

### Audio Engineering
- **Web Audio API**: Custom implementation of a 10-band `BiquadFilterNode` chain for the Equalizer.
- **Canvas API Visualizer**: Real-time audio visualization with multiple modes (Bars, Circular, Waveform, Particles).
- **Dual-Buffer System**: Orchestrates gapless playback and crossfading using multiple `HTMLAudioElement` instances.
- **Color Extraction**: Uses `colorthief` to analyze album art and update the `--accent-color` CSS variable in real-time.

### Integration
- **JioSaavn API**: Powering the vast library of over 80 million tracks.
- **LRCLib**: Integration for high-quality, synchronized lyrics.
- **Media Session API**: Support for hardware media keys and OS-level playback notifications.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Wenodh/Music-Beta.git
   cd Music-Beta
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the development server**:
   ```bash
   npm run dev
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📸 Screenshots & Visuals

> [!NOTE]
> *Placeholders for actual application screenshots.*

| Home Dashboard | Mobile Player | Equalizer |
| :---: | :---: | :---: |
| ![Home](https://via.placeholder.com/800x450?text=VibeOn+Home+Dashboard) | ![Player](https://via.placeholder.com/300x600?text=Mobile+Now+Playing) | ![EQ](https://via.placeholder.com/400x300?text=10-Band+Equalizer) |

---

## 🤝 Contributing
Contributions are welcome! If you'd like to improve VibeOn, feel free to fork the repository and submit a pull request.

---

## 🙏 Acknowledgments
- Inspired by the modern music streaming landscape.
- Powered by the [Saavn API](https://saavn.dev/).
- Built with ❤️ by [Wenodh](https://github.com/Wenodh)
