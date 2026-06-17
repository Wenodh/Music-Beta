# Android Play Store Release & Key Management 🚀

This guide explains how to manage your Android signing keys and how to reset your upload key in the Google Play Console if you've lost your original keystore.

## 🔑 Key Management

Your app is signed using a Java Keystore (.keystore). This key is required for Google Play to accept your app updates.

### GitHub Secrets Configuration

The GitHub Actions workflow (`android-build.yml`) requires the following secrets to be set in your repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Description |
|-------------|-------------|
| `RELEASE_KEY_BASE64` | The Base64 encoded string of your `release-key.keystore` file. |
| `RELEASE_STORE_PASSWORD` | The password for the keystore storage. |
| `RELEASE_KEY_ALIAS` | The alias for the key (e.g., `vibeon-key`). |
| `RELEASE_KEY_PASSWORD` | The password for the specific key alias. |

> **Security Note**: Never commit these passwords or the raw keystore file to the repository. Use GitHub Secrets to keep them secure.

---

## 🔄 How to Reset your Upload Key (Google Play Console)

If you've lost your original keystore, you must request an "Upload Key Reset" from Google.

1.  **Generate a new key and certificate**: A new key has been generated, and the certificate is available in the handover documentation.
2.  **Locate the PEM Certificate**: You will need the text between `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----`.
3.  **Contact Google Play Support**:
    *   Go to the [Google Play Console](https://play.google.com/console/).
    *   Select your app.
    *   Go to **Setup > App integrity**.
    *   Select the **App signing** tab.
    *   Click **Request upload key reset**.
    *   Upload the `upload_certificate.pem` file when prompted.
4.  **Wait for Approval**: Google usually takes 24-48 hours to process the request. After that, you can use the new key to sign and upload your app.

---

## 🛡️ Recovery: How to recreate your Keystore file

If you only have the `RELEASE_KEY_BASE64` string and need to recreate the physical `.keystore` file for local use:

1.  Copy the Base64 string into a file named `key.txt`.
2.  Run the following command:
    ```bash
    base64 --decode key.txt > release-key.keystore
    ```
3.  You can now use this file in Android Studio or with `keytool`.

---

## 🛠️ App Fingerprints (for Google OAuth/Firebase)

If you need to update your SHA fingerprints in the Google Cloud Console or Supabase:

*   **SHA-1**: `7C:22:FB:B5:F9:7E:C9:FF:58:72:AC:4D:74:8D:77:A3:F1:E6:0D:9A`
*   **SHA-256**: `ED:95:7D:30:60:2E:EF:BF:6F:8E:08:DC:23:EF:22:6C:D9:8A:90:B4:D6:BA:8B:AD:7A:C8:5B:6C:4A:57:E2:DF`
