import { describe, it, expect } from 'vitest';
import { parseLRC } from './lrcParser';

describe('lrcParser', () => {
    it('should parse basic LRC lines', () => {
        const lrc = '[00:12.34]Lyric line 1\n[00:15.67]Lyric line 2';
        const parsed = parseLRC(lrc);
        expect(parsed).toHaveLength(2);
        expect(parsed[0]).toEqual({ time: 12.34, text: 'Lyric line 1' });
        expect(parsed[1]).toEqual({ time: 15.67, text: 'Lyric line 2' });
    });

    it('should handle multiple time tags on one line', () => {
        const lrc = '[00:12.34][00:20.00]Repeated lyric';
        const parsed = parseLRC(lrc);
        expect(parsed).toHaveLength(2);
        expect(parsed[0]).toEqual({ time: 12.34, text: 'Repeated lyric' });
        expect(parsed[1]).toEqual({ time: 20.00, text: 'Repeated lyric' });
    });

    it('should handle 3-digit milliseconds', () => {
        const lrc = '[00:12.345]Detailed lyric';
        const parsed = parseLRC(lrc);
        expect(parsed[0].time).toBe(12.345);
    });

    it('should sort lyrics by time', () => {
        const lrc = '[00:20.00]Later\n[00:10.00]Earlier';
        const parsed = parseLRC(lrc);
        expect(parsed[0].time).toBe(10);
        expect(parsed[1].time).toBe(20);
    });
});
