import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from './decodeHtml';

describe('decodeHtmlEntities', () => {
    it('should decode common HTML entities', () => {
        expect(decodeHtmlEntities('Hello &amp; World')).toBe('Hello & World');
        expect(decodeHtmlEntities('Rock &apos;n&apos; Roll')).toBe("Rock 'n' Roll");
        expect(decodeHtmlEntities('Double &quot; Quotes')).toBe('Double " Quotes');
    });

    it('should handle empty strings', () => {
        expect(decodeHtmlEntities('')).toBe('');
    });

    it('should return the same string if no entities are present', () => {
        expect(decodeHtmlEntities('Plain text')).toBe('Plain text');
    });
});
