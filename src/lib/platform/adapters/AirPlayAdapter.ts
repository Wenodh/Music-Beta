import { PlatformAdapter, PlatformCapabilities } from '../types';

export class AirPlayAdapter implements PlatformAdapter {
    id = 'airplay';

    async initialize() {
        // AirPlay is usually handled natively by the browser's audio element
        // but we can listen for events if available.
    }

    destroy() {}

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            airplay: (window as any).WebKitPlaybackTargetAvailabilityEvent !== undefined
        };
    }
}
