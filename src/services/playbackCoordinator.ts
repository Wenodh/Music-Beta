/**
 * Acquires exclusive playback ownership for this browser tab when Web Locks is
 * available. The returned disposer releases the lock when playback stops.
 * BroadcastChannel remains the fallback on browsers without Web Locks.
 */
export function acquirePlaybackOwnership(onDenied: () => void): () => void {
    if (typeof navigator === 'undefined' || !('locks' in navigator) || !navigator.locks?.request) {
        return () => undefined;
    }

    let cancelled = false;
    let releaseLock: (() => void) | null = null;
    const holdLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
        if (cancelled) resolve();
    });

    void navigator.locks.request(
        'vibeon-playback-owner',
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
            if (cancelled) return;
            if (!lock) {
                onDenied();
                return;
            }
            await holdLock;
        }
    ).catch((error) => {
        console.warn('[PlaybackCoordinator] Web Locks unavailable; using BroadcastChannel fallback:', error);
    });

    return () => {
        cancelled = true;
        releaseLock?.();
    };
}
