import { useEffect, useRef } from 'react';
import { backNavigationService, BackHandlerOptions } from '../services/backNavigationService';

/**
 * React hook to register a back action handler for an overlay, modal, drawer or sub-view.
 * When `active` is true, the handler is pushed to the back navigation stack.
 * Pressing back on Android, browser, keyboard (Escape), or gesture executes `onBack`
 * if this overlay is the topmost one.
 *
 * @param active Whether the overlay is currently mounted/visible
 * @param options Handler options (id, priority, onBack)
 */
export const useBackHandler = (
    active: boolean,
    options: Omit<BackHandlerOptions, 'id'> & { id: string }
) => {
    const onBackRef = useRef(options.onBack);
    onBackRef.current = options.onBack;

    const { id, priority } = options;

    useEffect(() => {
        if (!active) return;

        const unregister = backNavigationService.registerOverlay({
            id,
            priority,
            onBack: () => onBackRef.current(),
        });

        return () => {
            unregister();
        };
    }, [active, id, priority]);
};
