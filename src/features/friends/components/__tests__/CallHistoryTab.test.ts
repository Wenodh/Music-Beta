import { describe, it, expect, beforeEach } from 'vitest';
import { formatCallDuration, formatCallTimestamp, getOutcomeBadge } from '../CallHistoryTab';
import { socialService } from '../../../../services/socialService';

describe('Sprint 2.1 Call History & Social Foundation Unit Tests', () => {
    describe('formatCallDuration', () => {
        it('formats zero or negative durations', () => {
            expect(formatCallDuration(0)).toBe('0s');
            expect(formatCallDuration(-5)).toBe('0s');
        });

        it('formats seconds only', () => {
            expect(formatCallDuration(45)).toBe('45s');
        });

        it('formats minutes and seconds', () => {
            expect(formatCallDuration(65)).toBe('1m 5s');
            expect(formatCallDuration(3600)).toBe('60m 0s');
        });
    });

    describe('formatCallTimestamp', () => {
        it('formats timestamps today', () => {
            const now = Date.now();
            const formatted = formatCallTimestamp(now);
            expect(formatted).toContain('Today');
        });

        it('formats older timestamps', () => {
            const older = new Date(2023, 0, 15, 14, 30).getTime();
            const formatted = formatCallTimestamp(older);
            expect(formatted).toContain('Jan 15');
        });
    });

    describe('getOutcomeBadge', () => {
        it('returns connected badge styling', () => {
            const badge = getOutcomeBadge('connected', 'incoming');
            expect(badge.label).toBe('Connected');
            expect(badge.color).toContain('text-green-400');
        });

        it('differentiates incoming missed call from outgoing unanswered', () => {
            const incomingMissed = getOutcomeBadge('missed', 'incoming');
            expect(incomingMissed.label).toBe('Missed Call');
            expect(incomingMissed.color).toContain('text-red-400');

            const outgoingMissed = getOutcomeBadge('missed', 'outgoing');
            expect(outgoingMissed.label).toBe('Unanswered');
        });

        it('handles declined and busy outcomes', () => {
            const declined = getOutcomeBadge('declined', 'outgoing');
            expect(declined.label).toBe('Declined');

            const busy = getOutcomeBadge('busy', 'outgoing');
            expect(busy.label).toBe('User Busy');
        });
    });

    describe('socialService.isValidUUID', () => {
        it('validates proper UUID v4', () => {
            expect(socialService.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
            expect(socialService.isValidUUID('c8803da1-6f4a-4e2b-9270-349f572a1f0a')).toBe(true);
        });

        it('rejects guest/anonymous and invalid strings', () => {
            expect(socialService.isValidUUID('anon-x8y9z12')).toBe(false);
            expect(socialService.isValidUUID('user_12345')).toBe(false);
            expect(socialService.isValidUUID('')).toBe(false);
            expect(socialService.isValidUUID('not-a-uuid')).toBe(false);
        });
    });
});
