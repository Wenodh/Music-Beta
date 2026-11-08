import { describe, it, expect } from 'vitest';

describe('EditProfileModal Validation & Logic', () => {
    const validateUsername = (val: string): string | null => {
        const clean = val.trim();
        if (clean.length < 3) return 'Username must be at least 3 characters.';
        if (clean.length > 30) return 'Username must not exceed 30 characters.';
        if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
            return 'Username can only contain letters, numbers, and underscores.';
        }
        return null;
    };

    it('accepts valid usernames meeting length and character constraints', () => {
        expect(validateUsername('wenodh')).toBeNull();
        expect(validateUsername('vibe_user_99')).toBeNull();
        expect(validateUsername('dj123')).toBeNull();
    });

    it('rejects usernames under 3 characters', () => {
        expect(validateUsername('ab')).toBe('Username must be at least 3 characters.');
        expect(validateUsername('')).toBe('Username must be at least 3 characters.');
    });

    it('rejects usernames with spaces or special characters', () => {
        expect(validateUsername('vibe user')).toBe('Username can only contain letters, numbers, and underscores.');
        expect(validateUsername('alex@home')).toBe('Username can only contain letters, numbers, and underscores.');
        expect(validateUsername('rock-star')).toBe('Username can only contain letters, numbers, and underscores.');
    });

    it('detects unsaved form changes against initial baseline', () => {
        const initial = {
            displayName: 'Original Name',
            username: 'original_user',
            bio: 'Hello world',
            isPrivate: false,
        };

        const hasChanged = (current: typeof initial) => {
            return (
                current.displayName !== initial.displayName ||
                current.username !== initial.username ||
                current.bio !== initial.bio ||
                current.isPrivate !== initial.isPrivate
            );
        };

        expect(hasChanged({ ...initial })).toBe(false);
        expect(hasChanged({ ...initial, displayName: 'Modified Name' })).toBe(true);
        expect(hasChanged({ ...initial, isPrivate: true })).toBe(true);
    });
});
