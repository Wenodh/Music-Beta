import { Song } from '../../../types/music';
import { ProviderAdapter } from '../types';

export class JioSaavnProviderAdapter implements ProviderAdapter {
    providerName = 'jiosaavn';

    async searchTracks(query: string, limit: number = 10): Promise<Song[]> {
        try {
            const response = await fetch(
                `https://jiosaavn-api-cyan-theta.vercel.app/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
            );
            if (!response.ok) return [];
            const data = await response.json();
            const results = data?.data?.results || data?.data || [];
            return Array.isArray(results) ? results : [];
        } catch {
            return [];
        }
    }

    async getTrackById(id: string): Promise<Song | null> {
        try {
            const response = await fetch(
                `https://jiosaavn-api-cyan-theta.vercel.app/api/songs/${id}`
            );
            if (!response.ok) return null;
            const data = await response.json();
            const song = data?.data?.[0] || data?.data;
            return song || null;
        } catch {
            return null;
        }
    }
}

export class SpotifyProviderAdapter implements ProviderAdapter {
    providerName = 'spotify';

    async searchTracks(): Promise<Song[]> {
        return [];
    }

    async getTrackById(): Promise<Song | null> {
        return null;
    }
}

export class YouTubeMusicProviderAdapter implements ProviderAdapter {
    providerName = 'ytmusic';

    async searchTracks(): Promise<Song[]> {
        return [];
    }

    async getTrackById(): Promise<Song | null> {
        return null;
    }
}

export class AppleMusicProviderAdapter implements ProviderAdapter {
    providerName = 'applemusic';

    async searchTracks(): Promise<Song[]> {
        return [];
    }

    async getTrackById(): Promise<Song | null> {
        return null;
    }
}

export class LocalMusicProviderAdapter implements ProviderAdapter {
    providerName = 'local';

    async searchTracks(): Promise<Song[]> {
        return [];
    }

    async getTrackById(): Promise<Song | null> {
        return null;
    }
}
