import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.VIBEON_E2E_BASE_URL || 'http://127.0.0.1:4173';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    timeout: 35_000,
    expect: { timeout: 10_000 },
    reporter: 'list',
    use: {
        baseURL,
        trace: 'retain-on-failure',
        serviceWorkers: 'block',
        launchOptions: {
            args: [
                '--use-fake-device-for-media-stream',
                '--use-fake-ui-for-media-stream',
                '--autoplay-policy=no-user-gesture-required',
            ],
        },
    },
    projects: [
        {
            name: 'web-chromium',
            use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
        },
        {
            // Mobile Chromium emulation exercises the responsive WebView-facing web layer.
            // Native Android service behavior is compiled in the Android CI workflow and still
            // requires a physical/emulated Android device for runtime verification.
            name: 'android-webview-emulation',
            use: { ...devices['Pixel 7'], browserName: 'chromium' },
        },
    ],
    webServer: process.env.VIBEON_E2E_BASE_URL ? undefined : {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
