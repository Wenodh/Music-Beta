import { eventBus } from '../events';
import { accountLinkingService } from '../auth/AccountLinkingService';

export interface ProviderHealth {
    status: 'healthy' | 'degraded' | 'unavailable';
    latency: number;
    lastChecked: string;
    errorCount: number;
    rateLimitRemaining?: number;
}

export class ProviderHealthManager {
    private static instance: ProviderHealthManager;
    private healthState: Map<string, ProviderHealth> = new Map();
    private checkInterval: any;

    private constructor() {
        this.startProactiveChecks();
    }

    public static getInstance(): ProviderHealthManager {
        if (!ProviderHealthManager.instance) {
            ProviderHealthManager.instance = new ProviderHealthManager();
        }
        return ProviderHealthManager.instance;
    }

    private startProactiveChecks() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => this.runChecks(), 5 * 60 * 1000);
    }

    private async runChecks() {
        const activeProviders = accountLinkingService.getAccounts()
            .filter(a => a.status === 'connected')
            .map(a => a.providerId);

        for (const providerId of activeProviders) {
            await this.checkProvider(providerId);
        }
    }

    public async checkProvider(providerId: string) {
        const start = Date.now();
        let status: ProviderHealth['status'] = 'healthy';

        try {
            // Lightweight ping simulated
            const latency = Date.now() - start;
            this.updateHealth(providerId, {
                status,
                latency,
                lastChecked: new Date().toISOString(),
                errorCount: 0
            });
        } catch (e) {
            this.reportError(providerId);
        }
    }

    public reportError(providerId: string) {
        const current = this.healthState.get(providerId) || {
            status: 'healthy',
            latency: 0,
            lastChecked: new Date().toISOString(),
            errorCount: 0
        };

        const newErrorCount = current.errorCount + 1;
        const newStatus = newErrorCount > 5 ? 'unavailable' : (newErrorCount > 2 ? 'degraded' : 'healthy');

        this.updateHealth(providerId, {
            ...current,
            status: newStatus,
            errorCount: newErrorCount,
            lastChecked: new Date().toISOString()
        });
    }

    private updateHealth(providerId: string, health: ProviderHealth) {
        this.healthState.set(providerId, health);
        eventBus.emit('PROVIDER_HEALTH_CHANGED', { providerId, health });
    }

    public getHealth(providerId: string): ProviderHealth | undefined {
        return this.healthState.get(providerId);
    }
}

export const providerHealthManager = ProviderHealthManager.getInstance();
