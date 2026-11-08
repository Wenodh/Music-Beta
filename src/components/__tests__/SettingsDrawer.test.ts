import { describe, it, expect } from 'vitest';
import { SETTINGS_CATEGORIES } from '../SettingsDrawer';

describe('SettingsDrawer Categories & Search Metadata', () => {
    it('defines exactly the 8 approved settings categories', () => {
        const expectedIds = [
            'account',
            'audio',
            'downloads',
            'appearance',
            'sounds',
            'privacy',
            'data',
            'about',
        ];
        const categoryIds = SETTINGS_CATEGORIES.map((c) => c.id);
        expect(categoryIds).toEqual(expectedIds);
    });

    it('each category has a non-empty title and description', () => {
        SETTINGS_CATEGORIES.forEach((cat) => {
            expect(cat.title.trim().length).toBeGreaterThan(0);
            expect(cat.description.trim().length).toBeGreaterThan(0);
            expect(cat.icon).toBeDefined();
        });
    });
});
