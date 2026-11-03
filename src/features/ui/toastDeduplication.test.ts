import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import uiReducer, { showToast, removeToast, clearAllToasts } from './uiSlice';

describe('Toast Notifications & Deduplication System (Task 6)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('1. Appends new toast with default 3000ms duration', () => {
        const state = uiReducer(undefined, showToast({ message: 'Saved successfully' }));
        expect(state.toasts.length).toBe(1);
        expect(state.toasts[0].message).toBe('Saved successfully');
        expect(state.toasts[0].duration).toBe(3000);
        expect(state.toasts[0].type).toBe('success');
    });

    it('2. Supports explicit duration overrides', () => {
        const state = uiReducer(undefined, showToast({ message: 'Important message', duration: 8000 }));
        expect(state.toasts.length).toBe(1);
        expect(state.toasts[0].duration).toBe(8000);
    });

    it('3. Suppresses duplicate toast with same message and type within deduplication window', () => {
        let state = uiReducer(undefined, showToast({ message: 'Repeated action' }));
        expect(state.toasts.length).toBe(1);

        // Immediate duplicate dispatch (e.g. from React double-render or repeated click)
        state = uiReducer(state, showToast({ message: 'Repeated action' }));
        expect(state.toasts.length).toBe(1);

        // Different message passes through
        state = uiReducer(state, showToast({ message: 'Different message' }));
        expect(state.toasts.length).toBe(2);

        // Advance timer past the 2.5s deduplication window
        vi.advanceTimersByTime(3000);

        // Now identical message is allowed
        state = uiReducer(state, showToast({ message: 'Repeated action' }));
        expect(state.toasts.length).toBe(3);
    });

    it('4. Allows different toast types with same text to render independently', () => {
        let state = uiReducer(undefined, showToast({ message: 'Warning', type: 'info' }));
        state = uiReducer(state, showToast({ message: 'Warning', type: 'error' }));

        expect(state.toasts.length).toBe(2);
        expect(state.toasts[0].type).toBe('info');
        expect(state.toasts[1].type).toBe('error');
    });

    it('5. Manual dismissal removes toast and clearAllToasts resets array', () => {
        let state = uiReducer(undefined, showToast({ message: 'Toast 1' }));
        state = uiReducer(state, showToast({ message: 'Toast 2' }));
        expect(state.toasts.length).toBe(2);

        const firstId = state.toasts[0].id;
        state = uiReducer(state, removeToast(firstId));
        expect(state.toasts.length).toBe(1);
        expect(state.toasts[0].message).toBe('Toast 2');

        state = uiReducer(state, clearAllToasts());
        expect(state.toasts.length).toBe(0);
    });
});
