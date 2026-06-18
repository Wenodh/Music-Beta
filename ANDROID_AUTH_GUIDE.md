# Google Login for Android - Setup Guide

To enable Google Login in your Android app, you need to configure three platforms: Google Cloud Console, Supabase, and Google Play Console.

## 1. Get your SHA-1 Fingerprints
Google needs to know your app is authentic. You need two fingerprints:
- **Debug Fingerprint**: For testing during development.
- **Release Fingerprint**: For the version you upload to the Play Store.

### How to get them:
1. **Locally (for Debug)**: Run this in your terminal inside the project:
   ```bash
   cd android && ./gradlew signingReport
   ```
   Look for the `SHA1` under the `debug` variant.

2. **Google Play Console (for Release)**:
   - Go to your app in the **Google Play Console**.
   - Navigate to **Setup** > **App Integrity**.
   - Under **App signing key certificate**, copy the **SHA-1 certificate fingerprint**.

## 2. Configure Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Go to **APIs & Services** > **Credentials**.
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
5. Select **Android** as the Application type.
6. Fill in the details:
   - **Name**: VibeOn Android (Debug/Release)
   - **Package name**: `com.wenodh.vibeon`
   - **SHA-1 certificate fingerprint**: (Paste the fingerprint from Step 1)
7. Click **Create**.
   *Note: Repeat this for both Debug and Release fingerprints.*

## 3. Configure Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** > **URL Configuration**.
3. Add `com.wenodh.vibeon://login` to the **Redirect URLs** list.
4. Go to **Authentication** > **Providers** > **Google**.
5. Ensure "Enabled" is toggled on.
6. If you haven't already, paste your **Client ID** and **Client Secret** (from the "Web client" credential in Google Cloud Console).

## 4. Update Android Environment
Since the Android app doesn't automatically see Vercel environment variables, you must ensure they are injected during the build.

If you are using **GitHub Actions** to build:
1. Go to your GitHub Repository **Settings** > **Secrets and variables** > **Actions**.
2. Add these as **Repository secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Why this works:
- **Deep Linking**: The app is now configured to listen for `com.wenodh.vibeon://login`. When the browser finishes the Google login, it redirects to this URL, and Android "catches" it and opens your app.
- **SHA-1**: Google uses the fingerprint to verify that the login request is coming from your specific Android app (and not someone else pretending to be you).
