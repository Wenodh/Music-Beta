# Android OAuth Setup Guide 📱

To enable Google OAuth in the Vibe On Android app, you must configure SHA-1 fingerprints in both the Google Cloud Console and the Supabase Dashboard.

## 1. Obtain SHA-1 Fingerprints

### Debug Fingerprint
Run the following command in the `android/` directory:
```bash
./gradlew signingReport
```
Look for the `SHA1` under `Variant: debug`.

### Release Fingerprint
If you have a keystore file:
```bash
keytool -list -v -keystore your-release-key.keystore
```

---

## 2. Google Cloud Console Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Select **Android** as the application type.
6. Enter the **Package Name**: `com.wenodh.vibeon`.
7. Enter your **SHA-1 certificate fingerprint**.
8. Click **Create**.
9. **Repeat** for both Debug and Release fingerprints.

---

## 3. Supabase Dashboard Configuration

1. Go to your [Supabase Project Dashboard](https://app.supabase.com/).
2. Navigate to **Authentication > Providers > Google**.
3. Ensure Google is enabled.
4. Scroll to **Redirect URLs** (under Authentication > Settings).
5. Add the following redirect URL:
   `com.wenodh.vibeon://login`

---

## 4. Capacitor Configuration

The app is already configured to handle the `com.wenodh.vibeon` scheme. When the user completes the OAuth flow in the browser, it will redirect back to the app, where the session will be automatically captured and established.

### Verification
If deep linking is not working, ensure the following is present in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.wenodh.vibeon" />
</intent-filter>
```
