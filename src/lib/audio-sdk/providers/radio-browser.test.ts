import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RadioBrowserProvider } from './radio-browser';

global.fetch = vi.fn();

describe('RadioBrowserProvider', () => {
    let provider: RadioBrowserProvider;

    beforeEach(() => {
        provider = new RadioBrowserProvider();
        vi.clearAllMocks();
    });

    it('should include offset in popular stations search', async () => {
        (fetch as Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await provider.getPopular(30, { page: 1 });

        const url = (fetch as Mock).mock.calls[0][0];
        expect(url).toContain('limit=30');
        expect(url).toContain('offset=30');
    });

    it('should include offset in trending stations search', async () => {
        (fetch as Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await provider.getTrending(20, { page: 2 });

        const url = (fetch as Mock).mock.calls[0][0];
        expect(url).toContain('limit=20');
        expect(url).toContain('offset=40');
    });

    it('should include offset in metadata search', async () => {
        (fetch as Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await provider.getStationsByMetadata('countries', 'India', { page: 3, limit: 10 });

        const url = (fetch as Mock).mock.calls[0][0];
        expect(url).toContain('limit=10');
        expect(url).toContain('offset=30');
        expect(url).toContain('India');
    });
});
