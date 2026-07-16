import { PlatformAdapter, PlatformCapabilities, Command, CommandPayload } from './types';
import { commandDispatcher } from './CommandDispatcher';

export class PlatformIntegrationManager {
    private static instance: PlatformIntegrationManager;
    private adapters: Map<string, PlatformAdapter> = new Map();
    private capabilities: PlatformCapabilities = {
        mediaSession: false,
        cast: false,
        airplay: false,
        notifications: false,
        backgroundPlayback: false,
        deepLinks: false,
        wearable: false,
        keyboardShortcuts: false,
        miniPlayer: false
    };

    private constructor() {}

    public static getInstance(): PlatformIntegrationManager {
        if (!PlatformIntegrationManager.instance) {
            PlatformIntegrationManager.instance = new PlatformIntegrationManager();
        }
        return PlatformIntegrationManager.instance;
    }

    public registerAdapter(adapter: PlatformAdapter) {
        this.adapters.set(adapter.id, adapter);
        this.updateCapabilities();
    }

    public destroy() {
        commandDispatcher.destroy();
        for (const adapter of this.adapters.values()) {
            adapter.destroy?.();
        }
    }

    public async initialize() {
        commandDispatcher.initialize();
        for (const adapter of this.adapters.values()) {
            await adapter.initialize();
        }
        this.updateCapabilities();
    }

    private updateCapabilities() {
        const newCapabilities = { ...this.capabilities };
        for (const adapter of this.adapters.values()) {
            const caps = adapter.getCapabilities();
            Object.assign(newCapabilities, caps);
        }
        this.capabilities = newCapabilities;
    }

    public getCapabilities(): PlatformCapabilities {
        return this.capabilities;
    }

    public async dispatchCommand(command: Command, payload?: CommandPayload) {
        await commandDispatcher.dispatch(command, payload);
    }

    // specific helper methods can be added here
    public isFeatureSupported(feature: keyof PlatformCapabilities): boolean {
        return this.capabilities[feature];
    }

    public getAdapter<T extends PlatformAdapter>(id: string): T | undefined {
        return this.adapters.get(id) as T;
    }
}

export const platformManager = PlatformIntegrationManager.getInstance();
