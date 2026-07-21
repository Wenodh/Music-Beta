export interface FeatureFlags {
    aiRecommendations: boolean;
    socialListening: boolean;
    casting: boolean;
    premiumProviders: boolean;
    developerDiagnostics: boolean;
    analytics: boolean;
    backgroundSync: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
    aiRecommendations: false,
    socialListening: false,
    casting: false,
    premiumProviders: false,
    developerDiagnostics: import.meta.env.DEV,
    analytics: false,
    backgroundSync: false,
};

export class FeatureFlagService {
    private flags: FeatureFlags;

    constructor() {
        this.flags = { ...DEFAULT_FLAGS, ...this.loadOverrides() };
    }

    private loadOverrides(): Partial<FeatureFlags> {
        try {
            const saved = localStorage.getItem('vibe_feature_flags');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    isEnabled(flag: keyof FeatureFlags): boolean {
        return this.flags[flag] ?? false;
    }

    setOverride(flag: keyof FeatureFlags, value: boolean) {
        const overrides = this.loadOverrides();
        overrides[flag] = value;
        localStorage.setItem('vibe_feature_flags', JSON.stringify(overrides));
        this.flags[flag] = value;
    }

    getAll(): FeatureFlags {
        return { ...this.flags };
    }

    reset() {
        localStorage.removeItem('vibe_feature_flags');
        this.flags = { ...DEFAULT_FLAGS };
    }
}

export const featureFlags = new FeatureFlagService();
