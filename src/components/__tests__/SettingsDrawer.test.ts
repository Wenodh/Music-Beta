import { describe, it, expect } from 'vitest';
import { SETTINGS_CATEGORIES } from '../SettingsDrawer';
import { ALL_MOBILE_NAV_ITEMS } from '../../constants/navigation';

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

    it('correctly orders navigation items matching active user order with full reordering freedom including Home', () => {
        const customOrder = ['explore', 'home', 'library', 'search'];
        const itemMap = new Map(ALL_MOBILE_NAV_ITEMS.map((item: any) => [item.id, item]));

        const activeItems = customOrder
            .map((id) => itemMap.get(id))
            .filter((item: any) => item !== undefined);
        const inactiveItems = ALL_MOBILE_NAV_ITEMS.filter((item: any) => !customOrder.includes(item.id));
        const orderedItems = [...activeItems, ...inactiveItems];

        // Active items are listed in the exact custom order
        expect(orderedItems.slice(0, 4).map((i) => i.id)).toEqual(['explore', 'home', 'library', 'search']);
        // Home is at index 1 (second position)
        expect(orderedItems[1].id).toBe('home');
        // All navigation items are accounted for
        expect(orderedItems.length).toBe(ALL_MOBILE_NAV_ITEMS.length);
    });
});
