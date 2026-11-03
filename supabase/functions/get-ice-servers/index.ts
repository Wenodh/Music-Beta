// Supabase Edge Function: get-ice-servers
// Provides short-lived, time-limited TURN/STUN credentials
// Serves UDP, TCP, and TLS (port 443) relays for symmetric NAT traversal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const meteredApiKey = Deno.env.get('METERED_API_KEY');
        const meteredDomain = Deno.env.get('METERED_DOMAIN') || 'vibeon.metered.live';

        // 1. If Metered.ca API Key is configured in environment
        if (meteredApiKey) {
            const response = await fetch(
                `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`
            );
            if (response.ok) {
                const iceServers = await response.json();
                return new Response(JSON.stringify({ iceServers }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }
        }

        // 2. If standard Coturn/RFC 5766 Shared Secret is configured
        const turnSecret = Deno.env.get('TURN_SHARED_SECRET');
        const turnRealm = Deno.env.get('TURN_REALM') || 'turn.vibeon.app';

        if (turnSecret) {
            const ttlSeconds = 24 * 3600; // 24 hours
            const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
            const username = `${expiry}:vibeon-user`;

            // Compute HMAC-SHA1 signature using Web Crypto API
            const encoder = new TextEncoder();
            const keyData = encoder.encode(turnSecret);
            const msgData = encoder.encode(username);

            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-1' },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
            const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));

            const iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: `turn:${turnRealm}:3478?transport=udp`, username, credential },
                { urls: `turn:${turnRealm}:3478?transport=tcp`, username, credential },
                { urls: `turns:${turnRealm}:443?transport=tcp`, username, credential },
            ];

            return new Response(JSON.stringify({ iceServers }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 3. Fallback: Free Public Relays / STUN for development & testing
        const fallbackServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun.relay.metered.ca:80' },
            // Public test TURN servers for relay testing in dev
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

        return new Response(JSON.stringify({ iceServers: fallbackServers }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
