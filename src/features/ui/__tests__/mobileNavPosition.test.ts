import { describe, it, expect } from 'vitest';
import uiReducer, { setMobileNavPosition, setMobileNavItems, MobileNavPosition } from '../uiSlice';

describe('Mobile Nav Dock Position State Tests', () => {
    it('initializes with default bottom dock position', () => {
        const state = uiReducer(undefined, { type: '@@INIT' });
        expect(state.mobileNavPosition).toBe('bottom');
    });

    it('updates position across all dock placements', () => {
        const positions: MobileNavPosition[] = ['top', 'left', 'right', 'bottom-left', 'bottom-right', 'bottom'];

        let state = uiReducer(undefined, { type: '@@INIT' });
        for (const pos of positions) {
            state = uiReducer(state, setMobileNavPosition(pos));
            expect(state.mobileNavPosition).toBe(pos);
        }
    });

    it('supports moving Home to any arbitrary index (e.g., 2nd or 3rd position)', () => {
        let state = uiReducer(undefined, { type: '@@INIT' });

        // Original default order: ['home', 'explore', 'search', 'globe', 'library', 'profile']
        expect(state.mobileNavItems[0]).toBe('home');

        // Move home to 2nd position (index 1)
        const homeSecond = ['explore', 'home', 'search', 'globe', 'library', 'profile'];
        state = uiReducer(state, setMobileNavItems(homeSecond));
        expect(state.mobileNavItems).toEqual(homeSecond);
        expect(state.mobileNavItems[1]).toBe('home');

        // Move home to 3rd position (index 2)
        const homeThird = ['explore', 'search', 'home', 'globe', 'library', 'profile'];
        state = uiReducer(state, setMobileNavItems(homeThird));
        expect(state.mobileNavItems).toEqual(homeThird);
        expect(state.mobileNavItems[2]).toBe('home');
    });
});
