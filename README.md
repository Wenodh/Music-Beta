# Music Beta - Modern Music Application

Music Beta is a high-performance, modern music streaming application built with React, TypeScript, and Tailwind CSS. It leverages the Saavn API to provide a seamless music listening experience with a focus on design, responsiveness, and speed.

🔗 **Demo**: [musicbeta.vercel.app](https://musicbeta.vercel.app)

---

## ✨ Key Features

- **Modern Glassmorphism UI**: A premium, "frosted glass" design aesthetic with fluid animations powered by Framer Motion.
- **TypeScript Powered**: Fully migrated to TypeScript for better maintainability and type safety.
- **Sleep Timer**: Set a timer to automatically pause your music, perfect for listening before bed.
- **Responsive Design**: optimized for both mobile and desktop experiences.
- **Real-time Music Data**: Integrated with the Saavn API for a vast library of songs, albums, and playlists.
- **Download Support**: High-quality song downloads for offline listening.
- **PWA Ready**: Installable on mobile and desktop as a Progressive Web App.
- **Dynamic Search**: Enhanced search results including playlists, artists, and albums.

---

## 🛠️ Technical Stack

- **Frontend**: React 18 (Vite)
- **Language**: TypeScript
- **State Management**: Redux Toolkit & Redux Persist
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: React Icons
- **Deployment**: Vercel

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Wenodh/Music-Beta.git
    cd Music-Beta
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```

---

## 📖 New Features Documentation

### Sleep Timer
The Sleep Timer can be found in the bottom music player. Click the timer icon to choose a duration (5m, 15m, 30m, 1h). The music will automatically pause once the time is up.

### TypeScript Integration
The project now uses TypeScript. All interfaces for music data (Songs, Albums, Artists) can be found in `src/types/music.ts`. This ensures that data throughout the app is handled safely and consistently.

### Glassmorphism & Animations
The UI has been updated with a "Glass" effect. You'll notice `backdrop-blur` and translucent backgrounds on the Navbar and Player. Framer Motion is used for:
- **Page Transitions**: Smooth transitions when moving between Home, Albums, and Artist pages.
- **Micro-interactions**: Buttons and cards scale and react to user input.
- **Entrance Animations**: Content staggers in gracefully when the app loads.

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions for new features or improvements, feel free to open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Inspired by [Raj Padval](https://www.linkedin.com/in/raj-padval-10869125b/)'s tutorial.
- Powered by the [Saavn API](https://saavn.dev/).

---

Made with ❤️ by [Wenodh](https://github.com/Wenodh)
