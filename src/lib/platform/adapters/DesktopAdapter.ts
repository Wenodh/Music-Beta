import { PlatformAdapter, PlatformCapabilities } from '../types';
import { commandDispatcher } from '../CommandDispatcher';

export class DesktopAdapter implements PlatformAdapter {
    id = 'desktop';

    async initialize() {
        this.setupKeyboardShortcuts();
    }

    private setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

            if (e.code === 'Space') {
                e.preventDefault();
                commandDispatcher.dispatch('togglePlay');
            } else if (e.code === 'ArrowLeft') {
                if (e.shiftKey) {
                    commandDispatcher.dispatch('previous');
                } else {
                    commandDispatcher.dispatch('seek', { value: -10, isRelative: true });
                }
            } else if (e.code === 'ArrowRight') {
                if (e.shiftKey) {
                    commandDispatcher.dispatch('next');
                } else {
                    commandDispatcher.dispatch('seek', { value: 10, isRelative: true });
                }
            } else if (e.key.toLowerCase() === 'l') {
                commandDispatcher.dispatch('favorite');
            } else if (ctrlKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                // trigger search
            }
        });
    }

    destroy() {}

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            keyboardShortcuts: true,
            miniPlayer: true
        };
    }
}
