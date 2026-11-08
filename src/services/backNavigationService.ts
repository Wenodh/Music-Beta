/**
 * Centralized Back Navigation Service
 *
 * Manages the dismissal ladder for overlays, modals, drawers, and popups
 * across platforms (Android hardware back, browser back button, Alt+Left,
 * mouse back button, swipe gestures, and desktop Escape key).
 */

export interface BackHandlerOptions {
    id: string;
    priority?: number; // Higher number = closes first
    onBack: () => boolean | void | Promise<boolean | void>; // return false to prevent default closure
}

interface OverlayEntry {
    id: string;
    priority: number;
    timestamp: number;
    onBack: () => boolean | void | Promise<boolean | void>;
}

class BackNavigationService {
    private overlayStack: OverlayEntry[] = [];
    private historySyntheticPushed = 0;
    private isProcessingBack = false;
    private initialized = false;

    // Listeners for UI updates/debugging
    private listeners: Array<() => void> = [];

    /**
     * Priority Constants for Standard App Layers:
     * Higher priority closes first.
     */
    public static readonly PRIORITY = {
        CONFIRMATION_DIALOG: 1000,
        NESTED_SHEET_OR_MENU: 800,  // e.g. In-call chat drawer, More menu action sheet, Volume sheet
        NESTED_SUB_VIEW: 700,       // e.g. Active friend chat in FriendsModal, Profile view in FriendsModal
        MODAL_DIALOG: 500,          // Standard modals: AddToPlaylist, Repair, DownloadManager, SessionModal, FriendsModal
        FULLSCREEN_OVERLAY: 400,    // Fullscreen view: ActiveCallModal (minimizing), MobileNowPlaying (Expanded Player)
        DRAWER_OR_PANEL: 300,       // Settings Drawer, Queue Drawer, Equalizer, Lyrics
    };

    constructor() {
        // Will initialize browser/history listeners on demand
    }

    public init(): () => void {
        if (typeof window === 'undefined') return () => {};
        if (this.initialized) return () => {};

        this.initialized = true;

        const handlePopState = (event: PopStateEvent) => {
            // When popstate fires from browser back / swipe gesture / Alt+Left:
            if (this.overlayStack.length > 0) {
                // An overlay is active! Intercept popstate and dismiss the topmost overlay
                if (this.historySyntheticPushed > 0) {
                    this.historySyntheticPushed = Math.max(0, this.historySyntheticPushed - 1);
                }
                const handled = this.handleBack();
                if (!handled) {
                    // If handler returned false (e.g. user canceled unsaved changes discard)
                    // Re-push a synthetic entry to maintain state
                    this.pushSyntheticHistoryState();
                } else if (this.overlayStack.length > 0) {
                    // If more nested overlays remain active, ensure synthetic history absorbs the next back action
                    this.pushSyntheticHistoryState();
                }
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (this.hasActiveOverlays()) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleBack();
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeyDown);
            this.initialized = false;
        };
    }

    /**
     * Push a synthetic history state if not already pushed, so the browser back button
     * triggers popstate instead of navigating to the previous page.
     */
    private pushSyntheticHistoryState() {
        if (typeof window === 'undefined') return;
        try {
            window.history.pushState({ isVibeOverlay: true, timestamp: Date.now() }, '');
            this.historySyntheticPushed++;
        } catch {
            // Ignore if restricted
        }
    }

    /**
     * Clean up synthetic history entries when overlays are closed programmatically
     * (e.g. clicking the 'X' button or backdrop).
     */
    private popSyntheticHistoryState() {
        if (typeof window === 'undefined') return;
        if (this.historySyntheticPushed > 0) {
            this.historySyntheticPushed--;
            // Silently back out of the synthetic entry if we are closing via UI
            try {
                window.history.back();
            } catch {
                // Ignore
            }
        }
    }

    /**
     * Register an active overlay with priority and callback.
     * Returns an unregister function.
     */
    public registerOverlay(options: BackHandlerOptions): () => void {
        const { id, priority = BackNavigationService.PRIORITY.MODAL_DIALOG, onBack } = options;

        // Remove existing entry with identical ID if already registered
        this.overlayStack = this.overlayStack.filter(entry => entry.id !== id);

        // Push synthetic history entry if this is the first overlay
        if (this.overlayStack.length === 0) {
            this.pushSyntheticHistoryState();
        }

        const newEntry: OverlayEntry = {
            id,
            priority,
            timestamp: Date.now(),
            onBack,
        };

        this.overlayStack.push(newEntry);
        // Sort stack by priority ascending (highest priority at end of array), then timestamp
        this.overlayStack.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return a.timestamp - b.timestamp;
        });

        this.notifyListeners();

        let unregistered = false;
        return () => {
            if (unregistered) return;
            unregistered = true;
            this.unregisterOverlay(id, true);
        };
    }

    /**
     * Unregister an overlay by id.
     * @param id Overlay ID
     * @param fromUserAction True if unregistering due to UI close button / programmatic dismiss
     */
    public unregisterOverlay(id: string, fromUserAction = false) {
        const initialLen = this.overlayStack.length;
        this.overlayStack = this.overlayStack.filter(entry => entry.id !== id);

        if (this.overlayStack.length === 0 && initialLen > 0) {
            if (fromUserAction && !this.isProcessingBack) {
                this.popSyntheticHistoryState();
            }
        }

        this.notifyListeners();
    }

    /**
     * Check if any overlays are currently active.
     */
    public hasActiveOverlays(): boolean {
        return this.overlayStack.length > 0;
    }

    /**
     * Get the count of active overlays.
     */
    public getActiveOverlayCount(): number {
        return this.overlayStack.length;
    }

    /**
     * Get the top-most active overlay entry.
     */
    public getTopOverlay(): OverlayEntry | null {
        if (this.overlayStack.length === 0) return null;
        return this.overlayStack[this.overlayStack.length - 1];
    }

    /**
     * Executes the back handler of the topmost overlay.
     * Returns true if an overlay was dismissed, false if nothing was handled or cancelled.
     */
    public handleBack(): boolean {
        if (this.overlayStack.length === 0) {
            return false;
        }

        const top = this.overlayStack[this.overlayStack.length - 1];
        if (!top) return false;

        this.isProcessingBack = true;
        try {
            const result = top.onBack();
            // If the handler returned false, cancellation occurred (e.g. unsaved changes confirm declined)
            if (result === false) {
                return false;
            }

            // Successfully handled; pop the entry from stack
            this.overlayStack = this.overlayStack.filter(entry => entry.id !== top.id);
            this.notifyListeners();
            return true;
        } finally {
            this.isProcessingBack = false;
        }
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => {
            try {
                l();
            } catch {
                // Ignore listener exceptions
            }
        });
    }

    /**
     * Reset service state (for test isolation)
     */
    public resetForTests() {
        this.overlayStack = [];
        this.historySyntheticPushed = 0;
        this.isProcessingBack = false;
        this.listeners = [];
    }
}

export const backNavigationService = new BackNavigationService();
