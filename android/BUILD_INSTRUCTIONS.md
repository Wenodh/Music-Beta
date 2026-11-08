# Android Build & Environment Setup Instructions (VIBE-BUG-015)

## Prerequisites
- Node.js >= 20.0.0
- JDK 21 (Ubuntu `openjdk-21-jdk` or Amazon Corretto 21)
- Android SDK Build-Tools 35.0.0 / SDK Platform 35
- Gradle 8.14.3 (or system Gradle >= 8.8)

## Fresh Checkout Verification
1. Install project dependencies:
   ```bash
   npm install --ignore-scripts
   ```
2. Build web production bundle:
   ```bash
   npm run build
   ```
3. Synchronize native Android platform:
   ```bash
   npx cap sync android
   ```
4. Assemble Debug APK:
   ```bash
   cd android && ./gradlew assembleDebug
   ```

## Production Release Signing
Release builds require credentials configured in `android/signing.properties` or environment variables:
- `RELEASE_STORE_FILE`
- `RELEASE_STORE_PASSWORD`
- `RELEASE_KEY_ALIAS`
- `RELEASE_KEY_PASSWORD`
