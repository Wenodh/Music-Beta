import { afterEach, describe, expect, it, vi } from 'vitest';
import { backNavigationService } from './backNavigationService';

describe('BackNavigationService route transitions', () => {
    afterEach(() => {
        backNavigationService.resetForTests();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('does not pop the router destination when an overlay closes for navigation', () => {
        vi.useFakeTimers();
        const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        const unregister = backNavigationService.registerOverlay({ id: 'settings', onBack: vi.fn() });

        // The router PUSH will reuse the overlay entry as the previous route.
        backNavigationService.preserveOverlayHistoryForNavigation();
        unregister();
        vi.advanceTimersByTime(32);

        expect(historyBack).not.toHaveBeenCalled();
    });

    it('still removes the synthetic history entry for an ordinary overlay dismissal', () => {
        vi.useFakeTimers();
        const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        const unregister = backNavigationService.registerOverlay({ id: 'settings', onBack: vi.fn() });

        unregister();
        vi.advanceTimersByTime(16);

        expect(historyBack).toHaveBeenCalledOnce();
    });
});
