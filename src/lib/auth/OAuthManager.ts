import { supabase } from '../supabase';

export interface OAuthSession {
    providerId: string;
    accessToken: string;
    expiresAt: number;
    refreshToken?: string;
    scope?: string[];
}

export class OAuthManager {
    private static instance: OAuthManager;

    private constructor() {}

    public static getInstance(): OAuthManager {
        if (!OAuthManager.instance) {
            OAuthManager.instance = new OAuthManager();
        }
        return OAuthManager.instance;
    }

    public async initiateLogin(providerId: string) {
        // Use Supabase Edge Function to get the authorize URL
        const { data, error } = await supabase.functions.invoke('get-provider-auth-url', {
            body: { providerId, redirectUri: window.location.origin + '/auth/callback' }
        });

        if (error) throw error;
        if (data?.url) {
            window.location.href = data.url;
        }
    }

    public async handleCallback(providerId: string, code: string) {
        const { data, error } = await supabase.functions.invoke('exchange-provider-code', {
            body: { providerId, code }
        });

        if (error) throw error;
        return data as OAuthSession;
    }

    public async refreshToken(providerId: string): Promise<OAuthSession> {
        const { data, error } = await supabase.functions.invoke('refresh-provider-token', {
            body: { providerId }
        });

        if (error) throw error;
        return data as OAuthSession;
    }

    public async getAccessToken(providerId: string): Promise<string | null> {
        // Logic to get token from state or secure storage, refreshing if expired
        return null;
    }
}

export const oauthManager = OAuthManager.getInstance();
