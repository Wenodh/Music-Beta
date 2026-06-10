# 🎧 Vibe On

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)
[![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

**Vibe On** is a premium, high-fidelity music application built for discovery and an immersive listening experience. Designed with a focus on polished UI/UX, it combines modern web technologies with native Android performance.

![Vibe On Explore Mobile](https://raw.githubusercontent.com/wenodh/vibeon/main/verification/explore_mobile_v4.png)

## ✨ Premium Features

- **🎴 3D Discovery**: A Tinder-style gesture-driven interface for exploring albums and tracks.
- **🎤 Synced Lyrics**: Beautifully animated, time-synced lyrics with one-tap seeking (Apple Music style).
- **👥 Group Sessions**: Listen together in real-time with friends. Sync play, pause, and seek events across devices.
- **🎛️ Pro Equalizer**: A 10-band graphic equalizer with custom presets for the audiophile in you.
- **🌈 Dynamic Themes**: The entire app's UI dynamically syncs its color palette with the current album art.
- **📊 High-Fidelity Visualizers**: 5 premium canvas-based visualizers (Particles, Waveform, Circular, etc.).
- **☁️ Cloud Sync**: Seamlessly sync your library, playlists, and settings via Supabase and Google OAuth.
- **📱 Native Android**: Full-featured Android app with hardware back button support and native status bar integration.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **State**: Redux Toolkit (Thunk + Listeners), Redux Persist
- **Backend**: Supabase (Auth, Database, Realtime)
- **Native**: Capacitor v8
- **CI/CD**: GitHub Actions (Automated Android Builds)

## 📖 Documentation

- **[User Guide](./docs/USER_GUIDE.md)**: How to use the app and its features.
- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)**: Technical setup, architecture, and contribution guidelines.
- **[Android Auth Guide](./docs/ANDROID_AUTH_GUIDE.md)**: Steps to configure Google OAuth for Android.
- **[Database Schema](./docs/supabase_schema.sql)**: SQL definitions for Supabase setup.

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Environment**:
   Create a `.env` file with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

## 📸 Screenshots

| Explore (Desktop) | Explore (Mobile) |
| :---: | :---: |
| ![Explore Desktop](https://raw.githubusercontent.com/wenodh/vibeon/main/verification/explore_desktop_v3.png) | ![Explore Mobile](https://raw.githubusercontent.com/wenodh/vibeon/main/verification/explore_mobile_v3.png) |

---
*Vibe On is a portfolio project created by [Wenodh](https://github.com/wenodh).*
