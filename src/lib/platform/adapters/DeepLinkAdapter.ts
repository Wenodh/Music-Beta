import { PlatformAdapter, PlatformCapabilities } from '../types';

export class DeepLinkAdapter implements PlatformAdapter {
    id = 'deep-links';

    async initialize() {
        this.setupCustomProtocol();
    }

    private setupCustomProtocol() {
        // For mobile/PWA, we might need to handle custom protocols
        // Capacitor or other bridges usually handle this.
    }

    public parseDeepLink(url: string) {
        try {
            if (url.includes('vibeon://')) {
                return url.split('vibeon://')[1];
            }
            if (url.includes('vibeon.app')) {
                return url.split('vibeon.app')[1];
            }

            const urlObj = new URL(url);
            if (urlObj.protocol === 'vibeon:') {
                return urlObj.pathname + urlObj.search;
            }
            if (urlObj.hostname === 'vibeon.app') {
                return urlObj.pathname + urlObj.search;
            }
        } catch (e) {
            // If it's not a valid URL but contains our strings, we already handled it above
        }
        return null;
    }

    destroy() {}

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            deepLinks: true
        };
    }
}
