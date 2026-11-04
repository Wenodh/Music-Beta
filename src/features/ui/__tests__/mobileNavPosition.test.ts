import { describe, it, expect } from 'vitest';
import uiReducer, { setMobileNavPosition, MobileNavPosition } from '../uiSlice';

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
});
