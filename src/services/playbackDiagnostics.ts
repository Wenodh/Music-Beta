export type PlaybackFailureKind = 'aborted' | 'network' | 'decode' | 'unsupported' | 'unknown';

export interface PlaybackDiagnosticEvent {
    at?: number;
    event: 'stream_recovery_started' | 'stream_recovery_succeeded' | 'stream_recovery_failed' | 'stream_recovery_exhausted';
    songId: string;
    code?: number;
}

const MAX_DIAGNOSTIC_EVENTS = 100;
const events: PlaybackDiagnosticEvent[] = [];

export function classifyMediaError(error: Pick<MediaError, 'code'> | null | undefined): PlaybackFailureKind | null {
    if (!error || !Number.isFinite(error.code)) return null;
    switch (error.code) {
        case 1: return 'aborted';
        case 2: return 'network';
        case 3: return 'decode';
        case 4: return 'unsupported';
        default: return 'unknown';
    }
}

/** Keep a small, URL-free in-memory diagnostic history for support/debugging. */
export function recordPlaybackDiagnostic(event: PlaybackDiagnosticEvent): void {
    events.push({ ...event, at: event.at ?? Date.now() });
    if (events.length > MAX_DIAGNOSTIC_EVENTS) events.splice(0, events.length - MAX_DIAGNOSTIC_EVENTS);
}

export function getPlaybackDiagnostics(): PlaybackDiagnosticEvent[] {
    return events.map((event) => ({ ...event }));
}

export function clearPlaybackDiagnostics(): void {
    events.length = 0;
}
