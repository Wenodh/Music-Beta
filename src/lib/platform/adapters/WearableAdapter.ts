import { PlatformAdapter, PlatformCapabilities } from '../types';
import { commandDispatcher } from '../CommandDispatcher';

export class WearableAdapter implements PlatformAdapter {
    id = 'wearable';

    async initialize() {
        // Wearable preparation
    }

    // Common wearable actions exposed
    public async handleAction(action: string) {
        switch (action) {
            case 'play': return commandDispatcher.dispatch('play');
            case 'pause': return commandDispatcher.dispatch('pause');
            case 'next': return commandDispatcher.dispatch('next');
            case 'previous': return commandDispatcher.dispatch('previous');
        }
    }

    destroy() {}

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            wearable: true
        };
    }
}
