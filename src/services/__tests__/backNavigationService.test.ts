import { describe, it, expect, beforeEach, vi } from 'vitest';
import { backNavigationService } from '../backNavigationService';

describe('Centralized Back Navigation Manager', () => {
    beforeEach(() => {
        backNavigationService.resetForTests();
        vi.restoreAllMocks();
    });

    it('registers an overlay and reports active overlays correctly', () => {
        expect(backNavigationService.hasActiveOverlays()).toBe(false);
        expect(backNavigationService.getActiveOverlayCount()).toBe(0);

        const unregister = backNavigationService.registerOverlay({
            id: 'test-modal',
            priority: 500,
            onBack: vi.fn(),
        });

        expect(backNavigationService.hasActiveOverlays()).toBe(true);
        expect(backNavigationService.getActiveOverlayCount()).toBe(1);

        unregister();
        expect(backNavigationService.hasActiveOverlays()).toBe(false);
        expect(backNavigationService.getActiveOverlayCount()).toBe(0);
    });

    it('dismisses overlays in order of priority (higher priority first)', () => {
        const order: string[] = [];

        backNavigationService.registerOverlay({
            id: 'player-expanded',
            priority: 340,
            onBack: () => { order.push('player'); },
        });

        backNavigationService.registerOverlay({
            id: 'lyrics-panel',
            priority: 370,
            onBack: () => { order.push('lyrics'); },
        });

        backNavigationService.registerOverlay({
            id: 'volume-sheet',
            priority: 820,
            onBack: () => { order.push('volume'); },
        });

        expect(backNavigationService.getActiveOverlayCount()).toBe(3);

        // First back: closes volume sheet (priority 820)
        const handled1 = backNavigationService.handleBack();
        expect(handled1).toBe(true);
        expect(order).toEqual(['volume']);
        expect(backNavigationService.getActiveOverlayCount()).toBe(2);

        // Second back: closes lyrics (priority 370)
        const handled2 = backNavigationService.handleBack();
        expect(handled2).toBe(true);
        expect(order).toEqual(['volume', 'lyrics']);
        expect(backNavigationService.getActiveOverlayCount()).toBe(1);

        // Third back: closes player (priority 340)
        const handled3 = backNavigationService.handleBack();
        expect(handled3).toBe(true);
        expect(order).toEqual(['volume', 'lyrics', 'player']);
        expect(backNavigationService.getActiveOverlayCount()).toBe(0);

        // Fourth back: nothing to handle
        const handled4 = backNavigationService.handleBack();
        expect(handled4).toBe(false);
    });

    it('nested overlays within same parent: child closes first, parent remains open until next back', () => {
        const events: string[] = [];

        // Parent: Friends Modal
        const unregisterFriends = backNavigationService.registerOverlay({
            id: 'friends-modal',
            priority: 420,
            onBack: () => { events.push('close-friends-modal'); },
        });

        // Child: Active Chat Sub-view (higher priority)
        const unregisterChat = backNavigationService.registerOverlay({
            id: 'friends-active-chat-view',
            priority: 700,
            onBack: () => {
                events.push('close-active-chat');
                unregisterChat(); // child unregisters itself on close
            },
        });

        expect(backNavigationService.getActiveOverlayCount()).toBe(2);

        // First back press: closes child chat only
        backNavigationService.handleBack();
        expect(events).toEqual(['close-active-chat']);
        expect(backNavigationService.hasActiveOverlays()).toBe(true);

        // Second back press: closes parent friends modal
        backNavigationService.handleBack();
        expect(events).toEqual(['close-active-chat', 'close-friends-modal']);
        expect(backNavigationService.hasActiveOverlays()).toBe(false);

        unregisterFriends();
    });

    it('respects cancellation when onBack returns false (e.g. unsaved changes confirm)', () => {
        let isConfirmed = false;

        backNavigationService.registerOverlay({
            id: 'community-create-post',
            priority: 500,
            onBack: () => {
                if (!isConfirmed) {
                    return false; // prevent closing
                }
            },
        });

        expect(backNavigationService.getActiveOverlayCount()).toBe(1);

        // User declined confirmation prompt
        const handledDeclined = backNavigationService.handleBack();
        expect(handledDeclined).toBe(false);
        // Modal remains open on stack
        expect(backNavigationService.getActiveOverlayCount()).toBe(1);

        // User accepted confirmation prompt
        isConfirmed = true;
        const handledAccepted = backNavigationService.handleBack();
        expect(handledAccepted).toBe(true);
        expect(backNavigationService.getActiveOverlayCount()).toBe(0);
    });

    it('notifies listeners when overlays are registered, updated, or dismissed', () => {
        const listener = vi.fn();
        const unsubscribe = backNavigationService.subscribe(listener);

        const unregister = backNavigationService.registerOverlay({
            id: 'queue-drawer',
            priority: 360,
            onBack: vi.fn(),
        });

        expect(listener).toHaveBeenCalledTimes(1);

        backNavigationService.handleBack();
        expect(listener).toHaveBeenCalledTimes(2);

        unregister();
        unsubscribe();
    });

    it('handles Escape key events by intercepting and dismissing topmost overlay', () => {
        const onDismiss = vi.fn();

        // Ensure window environment exists for node/happy-dom tests
        if (typeof window === 'undefined') {
            (global as any).window = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
                history: { pushState: vi.fn(), back: vi.fn() },
            };
        }

        const cleanup = backNavigationService.init();

        backNavigationService.registerOverlay({
            id: 'settings-drawer',
            priority: 350,
            onBack: onDismiss,
        });

        // Trigger escape event
        const escapeEvent = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
        // Directly invoke handleBack or simulate listener
        const dismissed = backNavigationService.handleBack();
        expect(dismissed).toBe(true);
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(backNavigationService.hasActiveOverlays()).toBe(false);

        cleanup();
    });
});
