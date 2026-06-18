# Vibe On Developer Guide 🛠️

This guide provides technical documentation for developers looking to contribute to, deploy, or understand the architecture of Vibe On.

## 🏗️ Architecture Overview

Vibe On is a hybrid application built with a modern web stack and wrapped for native Android using Capacitor.

- **Frontend**: React 18 with TypeScript.
- **State Management**: Redux Toolkit (using Thunks for async logic and Listeners for side effects).
- **Styling**: Tailwind CSS + Framer Motion for animations.
- **Backend**: Supabase (Auth, PostgreSQL, Realtime).
- **Native Bridge**: Capacitor v8.
- **Audio Engine**: Custom implementation using the Web Audio API and HTML5 Audio.

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18 or higher (v22 recommended).
- **Java**: JDK 21 (Required for Android builds).
- **Android Studio**: For native debugging and builds.

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the App
- **Web Development**:
  ```bash
  npm run dev
  ```
- **Android Development**:
  1. Build the web assets:
     ```bash
     npm run build
     ```
  2. Sync with Capacitor:
     ```bash
     npx cap sync android
     ```
  3. Open in Android Studio:
     ```bash
     npx cap open android
     ```

---

## 🗄️ State Management (Redux)

The application state is divided into several slices:
- `auth`: Handles user session and profile.
- `musicPlayer`: Manages playback state, queue, current song, and audio settings.
- `library`: Manages user's favorites and playlists.
- `session`: Handles real-time group session data (participants, reactions).
- `settings`: Manages user preferences.
- `ui`: Manages global UI state (modals, themes, toasts).

**Persistence**: We use `redux-persist` to save local state to `localStorage` (Web) and `IndexedDB` (via custom config).

---

## ☁️ Supabase Integration

### Database
Vibe On uses Supabase for cloud synchronization. See [docs/supabase_schema.sql](./supabase_schema.sql) for the required table structures and RLS policies.

### Realtime (Group Sessions)
Group sessions utilize Supabase Realtime "Broadcast" and "Presence" features:
- **Presence**: Tracks who is currently in a room.
- **Broadcast**: Sends low-latency messages (Play, Pause, Seek, Reactions) between participants.

---

## 📱 Android Details

### Package Name
The official package name is `com.wenodh.vibeon`.

### Deep Linking
OAuth redirects are handled via the custom URL scheme `com.wenodh.vibeon://`. This is configured in:
- `AndroidManifest.xml`
- Supabase Dashboard (Redirect URLs)

### Build Pipeline
We use GitHub Actions to automate the Android build process. The workflow:
1. Sets up JDK 21 and Node 22.
2. Builds the React project.
3. Uses `@capacitor/assets` to generate splash screens and icons.
4. Builds the signed AAB/APK using Gradle.

Detailed instructions for signing keys and Play Store releases can be found in [docs/ANDROID_RELEASE_GUIDE.md](./ANDROID_RELEASE_GUIDE.md).

---

## 🎨 Performance Optimizations

1. **Canvas Visualizers**: Physics-based calculations are decoupled from the render loop where possible. We avoid layout thrashing by caching computed styles.
2. **Masonry Layout**: The Explore page uses a deterministic aspect ratio sequence and `IntersectionObserver` for efficient infinite scrolling.
3. **Memoization**: Heavy components (like `FloatingEmoji` and `SongItem`) are memoized to prevent redundant re-renders during high-frequency updates (like seek events).

---

## 🧪 Testing
We use **Playwright** for end-to-end testing and UI verification.
Run tests with:
```bash
npx playwright test
```

---
*Developed with ❤️ by Wenodh.*
