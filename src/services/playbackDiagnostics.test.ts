import { afterEach, describe, expect, it } from 'vitest';
import { classifyMediaError, clearPlaybackDiagnostics, getPlaybackDiagnostics, recordPlaybackDiagnostic } from './playbackDiagnostics';

describe('playbackDiagnostics', () => {
    afterEach(() => clearPlaybackDiagnostics());

    it('classifies standard HTML media errors', () => {
        expect(classifyMediaError({ code: 1 } as MediaError)).toBe('aborted');
        expect(classifyMediaError({ code: 2 } as MediaError)).toBe('network');
        expect(classifyMediaError({ code: 3 } as MediaError)).toBe('decode');
        expect(classifyMediaError({ code: 4 } as MediaError)).toBe('unsupported');
        expect(classifyMediaError(null)).toBeNull();
    });

    it('retains only the newest 100 diagnostic events without stream URLs', () => {
        for (let index = 0; index < 105; index += 1) {
            recordPlaybackDiagnostic({ event: 'stream_recovery_started', songId: String(index), code: 2 });
        }
        const result = getPlaybackDiagnostics();
        expect(result).toHaveLength(100);
        expect(result[0].songId).toBe('5');
        expect(JSON.stringify(result)).not.toContain('https://');
    });

    it('returns copies so consumers cannot mutate the diagnostic buffer', () => {
        recordPlaybackDiagnostic({ event: 'stream_recovery_failed', songId: 'song-1' });
        const result = getPlaybackDiagnostics();
        result[0].songId = 'mutated';
        expect(getPlaybackDiagnostics()[0].songId).toBe('song-1');
    });
});
