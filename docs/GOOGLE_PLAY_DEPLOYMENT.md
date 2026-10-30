# Vibe On — Google Play Store Production Deployment Guide 🚀

This guide provides step-by-step instructions for building, signing, and submitting the **Vibe On** Android application (`com.wenodh.vibeon`) to the Google Play Store.

---

## 📋 Table of Contents
1. [Prerequisites & Versioning](#1-prerequisites--versioning)
2. [Generating an Upload Keystore](#2-generating-an-upload-keystore)
3. [Secure Storage & Keystore Backup](#3-secure-storage--keystore-backup)
4. [Configuring Local Signing Properties](#4-configuring-local-signing-properties)
5. [Building Production Release Artifacts (AAB & APK)](#5-building-production-release-artifacts-aab--apk)
6. [Verifying Release Signatures & Metadata](#6-verifying-release-signatures--metadata)
7. [Google Play App Signing Configuration](#7-google-play-app-signing-configuration)
8. [Google Play Console Setup & Track Rollouts](#8-google-play-console-setup--track-rollouts)
9. [Permissions, Target SDK, & Foreground Services](#9-permissions-target-sdk--foreground-services)
10. [Data Safety Declaration Guidance](#10-data-safety-declaration-guidance)
11. [Content Rating & App Access Declarations](#11-content-rating--app-access-declarations)
12. [Required Store Graphics & Text Assets](#12-required-store-graphics--text-assets)
13. [Privacy Policy Requirements](#13-privacy-policy-requirements)
14. [Pre-Submission Checklist & Rejection Risks](#14-pre-submission-checklist--rejection-risks)

---

## 1. Prerequisites & Versioning

### Environment Requirements
* **Node.js**: v22.0.0 or higher.
* **Java Development Kit**: JDK 21.
* **Android SDK**: `compileSdkVersion 36`, `targetSdkVersion 36`, `minSdkVersion 24`.
* **Capacitor**: v8 (`@capacitor/android` v8.6.0).

### Release Versioning
Application versioning is configured in `android/app/build.gradle`:
* **Version Code**: `6` (Must strictly increment for every new Play Console submission).
* **Version Name**: `1.0.2` (User-visible release version).
* **`package.json`**: `1.0.2` (Kept in alignment with app releases).

---

## 2. Generating an Upload Keystore

To sign production release builds locally or in CI, generate a 2048-bit RSA upload keystore using `keytool`:

```bash
cd android
keytool -genkey -v \
  -keystore release-key.keystore \
  -alias vibeon-upload-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Vibe On Release, OU=Mobile, O=Vibe On, L=City, ST=State, C=US"
```

*When prompted, set a strong store password and key password.*

---

## 3. Secure Storage & Keystore Backup

⚠️ **CRITICAL SECURITY WARNING**:
- **Never commit `.keystore`, `.jks`, or `signing.properties` to Git.**
- If you lose your upload key and do not use Google Play App Signing, you will **never** be able to update your application again.
- Store a backup copy of your upload keystore in a secure password manager (e.g. 1Password, Bitwarden, AWS Secrets Manager).

The repository `.gitignore` files are pre-configured to strictly exclude all keystores and `signing.properties`.

---

## 4. Configuring Local Signing Properties

1. Copy `android/signing.properties.example` to `android/signing.properties`:
   ```bash
   cp android/signing.properties.example android/signing.properties
   ```
2. Fill in your keystore credentials in `android/signing.properties`:
   ```properties
   RELEASE_STORE_FILE=release-key.keystore
   RELEASE_STORE_PASSWORD=your_keystore_password
   RELEASE_KEY_ALIAS=vibeon-upload-key
   RELEASE_KEY_PASSWORD=your_key_password
   ```

*Note: Relative paths are resolved against the `android/` directory.*

### CI/CD Pipeline Environment Variables
In automated CI runners (e.g. GitHub Actions), you can set environment variables instead of creating a file:
* `RELEASE_STORE_FILE`
* `RELEASE_STORE_PASSWORD`
* `RELEASE_KEY_ALIAS`
* `RELEASE_KEY_PASSWORD`

---

## 5. Building Production Release Artifacts (AAB & APK)

Always build fresh production web assets before compiling the native Android binaries.

### Step 1: Compile Web Assets & Sync Capacitor
```bash
npm run build
npx cap sync android
```

### Step 2: Build Signed Android App Bundle (AAB) & Release APK
```bash
cd android
./gradlew bundleRelease assembleRelease
```

### Artifact Output Locations
* **Android App Bundle (AAB)** *(Required for Play Store Upload)*:
  `android/app/build/outputs/bundle/release/app-release.aab`
* **Release APK** *(For local testing/sideloading)*:
  `android/app/build/outputs/apk/release/app-release.apk`

---

## 6. Verifying Release Signatures & Metadata

Verify the generated release bundle signature and certificates using `keytool`:

```bash
keytool -printcert -jarfile android/app/build.gradle/outputs/bundle/release/app-release.aab
```

Expect to see your keystore's `Owner`, `Issuer`, `SHA1`, and `SHA256` fingerprints in the output.

---

## 7. Google Play App Signing Configuration

Google Play uses **Play App Signing**.
1. When creating your app in the Google Play Console, accept the default **Play App Signing** setup.
2. Google generates and maintains the app signing key used to sign APKs delivered to user devices.
3. Your local keystore serves as the **Upload Key**.
4. Obtain the SHA-1 and SHA-256 fingerprints of your upload keystore and add them to Google Cloud Console and Supabase Dashboard for Google OAuth redirect support.

---

## 8. Google Play Console Setup & Track Rollouts

1. Log into [Google Play Console](https://play.google.com/console).
2. Click **Create App**:
   * **App Name**: Vibe On
   * **Default Language**: English (US)
   * **App or Game**: App
   * **Free or Paid**: Free
3. **Recommended Release Sequence**:
   * **Internal Testing**: Upload `app-release.aab` to Internal Testing track for immediate verification.
   * **Closed Testing (Alpha/Beta)**: Test with selected user groups.
   * **Production Release**: Promote verified build to Production (optional phased rollout e.g. 20% -> 50% -> 100%).

---

## 9. Permissions, Target SDK, & Foreground Services

### Declared App Permissions (`AndroidManifest.xml`)
* `android.permission.INTERNET`: Required for network audio streaming and API metadata synchronization.
* `android.permission.WAKE_LOCK`: Prevents CPU sleeping during active background music playback.
* `android.permission.FOREGROUND_SERVICE`: Grants background service execution.
* `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`: (Android 14+ requirement) Required for ongoing audio playback notifications and lock screen media controls.
* `android.permission.POST_NOTIFICATIONS`: (Android 13+ requirement) Required to display media player controls in the system notification shade.

### Declaration in Play Console
When submitting in Play Console:
1. Under **App Content > Foreground Service Permissions**, select **Media Playback**.
2. Provide a short justification: *"Vibe On is a music streaming application that plays user-selected audio streams in the background with lock screen media controls and persistent notification controls."*

---

## 10. Data Safety Declaration Guidance

Complete the **Data Safety** form in Play Console based on Vibe On's data practices:

1. **Does your app collect or share user data?**: Yes (for account authentication and syncing).
2. **Data Collected**:
   * **User Identifiers**: Email address and User ID (via Supabase Auth for login/account sync).
   * **App Activity**: In-app user actions (Favorites, saved playlists, listening history synced to Supabase).
3. **Data Sharing**: No data is shared with third parties for advertising or marketing.
4. **Security Practices**:
   * All data in transit is encrypted using HTTPS / TLS.
   * Users can request account and data deletion.

---

## 11. Content Rating & App Access Declarations

1. **Content Rating Questionnaire**:
   * Select category: **Entertainment / Music**.
   * Answer 'No' to explicit user content generation, drug references, or gambling.
2. **App Access**:
   * Select **"All or some functionality is restricted"** if login is required to test full syncing features.
   * Provide test credentials (demo email and password) for Google Play review staff.

---

## 12. Required Store Graphics & Text Assets

Prepare the following store assets:

| Asset Type | Specifications | Requirements |
| :--- | :--- | :--- |
| **App Icon** | 512 x 512 px, 32-bit PNG | High resolution Vibe On logo |
| **Feature Graphic** | 1024 x 500 px, JPG or 24-bit PNG | Cyber theme artwork displaying Vibe On branding |
| **Phone Screenshots** | Minimum 2, max 8 screenshots | 16:9 or 9:16 portrait aspect ratio (e.g. 1080x1920) |
| **Short Description** | Max 80 characters | "Immersive high-fidelity music streaming, audiobooks, and radio." |
| **Full Description** | Max 4000 characters | Detailed feature showcase (Dual-buffer crossfade, offline storage, group sessions, cyber themes) |

---

## 13. Privacy Policy Requirements

Google Play Store **requires** a publicly accessible Privacy Policy URL for apps requesting permissions or handling user accounts.

1. A draft privacy policy has been generated at `docs/PRIVACY_POLICY_DRAFT.md`.
2. Deploy this draft to a public URL (e.g., `https://vibeon.app/privacy` or hosted on GitHub Pages / Vercel).
3. Enter the public URL under **App Content > Privacy Policy** in the Google Play Console.

---

## 14. Pre-Submission Checklist & Rejection Risks

- [x] `versionCode` set to `6` and `versionName` set to `1.0.2` in `android/app/build.gradle`.
- [x] Target SDK set to `36` (Android 16 compatibility).
- [x] `signing.properties` created locally with valid upload key credentials.
- [x] Web assets built (`npm run build`) and synced to Capacitor (`npx cap sync android`).
- [x] Signed AAB generated successfully via `./gradlew bundleRelease`.
- [ ] SHA-1 and SHA-256 signatures registered in Google Cloud Console & Supabase Redirect URIs.
- [ ] Privacy Policy deployed to a public HTTP/HTTPS URL and entered in Play Console.
- [ ] Demo credentials provided for Play Store app review team under App Access.
- [ ] Store graphics (App Icon, Feature Graphic, Screenshots) uploaded to Play Console.
