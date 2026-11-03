import { supabase } from '../../lib/supabase';

export interface DynamicIceConfig {
    iceServers: RTCIceServer[];
    iceTransportPolicy?: RTCIceTransportPolicy;
    fetchedAt: number;
    ttlMs: number;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    // Open Relay Project TURN servers supporting UDP, TCP, and TLS (port 443)
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

class IceServerService {
    private cachedConfig: DynamicIceConfig | null = null;
    private fetchPromise: Promise<RTCIceServer[]> | null = null;
    private forceRelayMode: boolean = false;

    /**
     * Set test mode to force relay traffic through TURN servers
     * (equivalent to iceTransportPolicy: 'relay')
     */
    public setForceRelay(enabled: boolean): void {
        this.forceRelayMode = enabled;
    }

    public isForceRelay(): boolean {
        return this.forceRelayMode;
    }

    /**
     * Retrieve active ICE servers, refreshing when TTL expires or falling back to STUN
     */
    public async getIceServers(): Promise<{ iceServers: RTCIceServer[]; iceTransportPolicy: RTCIceTransportPolicy }> {
        const now = Date.now();

        // Check if cache is still valid
        if (this.cachedConfig && (now - this.cachedConfig.fetchedAt < this.cachedConfig.ttlMs)) {
            return {
                iceServers: this.cachedConfig.iceServers,
                iceTransportPolicy: this.forceRelayMode ? 'relay' : (this.cachedConfig.iceTransportPolicy || 'all'),
            };
        }

        // Deduplicate in-flight fetch
        if (!this.fetchPromise) {
            this.fetchPromise = this.fetchTurnCredentials();
        }

        try {
            const servers = await this.fetchPromise;
            this.cachedConfig = {
                iceServers: servers,
                iceTransportPolicy: this.forceRelayMode ? 'relay' : 'all',
                fetchedAt: Date.now(),
                ttlMs: 3600 * 1000, // 1 hour TTL default
            };
        } catch (err) {
            console.warn('[IceServerService] Falling back to default ICE servers:', err);
            return {
                iceServers: DEFAULT_ICE_SERVERS,
                iceTransportPolicy: this.forceRelayMode ? 'relay' : 'all',
            };
        } finally {
            this.fetchPromise = null;
        }

        return {
            iceServers: this.cachedConfig?.iceServers || DEFAULT_ICE_SERVERS,
            iceTransportPolicy: this.forceRelayMode ? 'relay' : (this.cachedConfig?.iceTransportPolicy || 'all'),
        };
    }

    /**
     * Fetch time-limited ephemeral TURN credentials securely from backend / Edge Function
     */
    private async fetchTurnCredentials(): Promise<RTCIceServer[]> {
        try {
            // Attempt Supabase Edge Function invocation if configured
            const { data, error } = await supabase.functions.invoke('get-ice-servers');

            if (!error && data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
                return data.iceServers;
            }
        } catch {
            // Edge function not deployed in local test/preview environment, fallback gracefully
        }

        // If Metered or custom TURN public endpoint is supplied in environment
        const customTurnApi = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_CREDENTIALS_URL) as string | undefined;
        if (customTurnApi) {
            try {
                const res = await fetch(customTurnApi);
                if (res.ok) {
                    const parsed = await res.json();
                    if (Array.isArray(parsed)) return parsed;
                    if (parsed && Array.isArray(parsed.iceServers)) return parsed.iceServers;
                }
            } catch (fetchErr) {
                console.warn('[IceServerService] Error fetching custom TURN credentials:', fetchErr);
            }
        }

        return DEFAULT_ICE_SERVERS;
    }

    /**
     * Synchronous access to currently cached or default ICE servers for immediate peer connection instantiation
     */
    public getInitialIceServers(): { iceServers: RTCIceServer[]; iceTransportPolicy: RTCIceTransportPolicy } {
        return {
            iceServers: this.cachedConfig?.iceServers || DEFAULT_ICE_SERVERS,
            iceTransportPolicy: this.forceRelayMode ? 'relay' : 'all',
        };
    }

    /**
     * Clear cached credentials (e.g. on manual reconnect or test tear down)
     */
    public clearCache(): void {
        this.cachedConfig = null;
        this.fetchPromise = null;
    }
}

export const iceServerService = new IceServerService();
