export type ConnectionQualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface CallQualityMetrics {
    level: ConnectionQualityLevel;
    rttMs: number | null;
    jitterMs: number | null;
    packetLossPercent: number | null;
    bitrateKbps: number | null;
    sampledAt: number;
}

export interface RawCallQualityMetrics {
    rttMs?: number | null;
    jitterMs?: number | null;
    packetLossPercent?: number | null;
    bitrateKbps?: number | null;
}

export const MAX_ICE_RESTART_ATTEMPTS = 4;
export const MAX_WAITING_CALLS = 1;

export const getIceRestartDelay = (attempt: number): number => {
    const delays = [1000, 2500, 5000, 9000];
    return delays[Math.min(Math.max(attempt - 1, 0), delays.length - 1)];
};

export const classifyCallQuality = (
    metrics: RawCallQualityMetrics,
    sampledAt = Date.now()
): CallQualityMetrics => {
    const rttMs = metrics.rttMs ?? null;
    const jitterMs = metrics.jitterMs ?? null;
    const packetLossPercent = metrics.packetLossPercent ?? null;
    const bitrateKbps = metrics.bitrateKbps ?? null;

    if (rttMs === null && jitterMs === null && packetLossPercent === null) {
        return { level: 'unknown', rttMs, jitterMs, packetLossPercent, bitrateKbps, sampledAt };
    }

    const poor = (rttMs !== null && rttMs >= 400) ||
        (jitterMs !== null && jitterMs >= 50) ||
        (packetLossPercent !== null && packetLossPercent >= 8);
    const fair = (rttMs !== null && rttMs >= 250) ||
        (jitterMs !== null && jitterMs >= 30) ||
        (packetLossPercent !== null && packetLossPercent >= 3);
    const good = (rttMs !== null && rttMs >= 150) ||
        (jitterMs !== null && jitterMs >= 20) ||
        (packetLossPercent !== null && packetLossPercent >= 1);

    return {
        level: poor ? 'poor' : fair ? 'fair' : good ? 'good' : 'excellent',
        rttMs,
        jitterMs,
        packetLossPercent,
        bitrateKbps,
        sampledAt,
    };
};

export const getMediaAccessErrorMessage = (error: unknown, media: 'microphone' | 'camera'): string => {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        return `${media === 'microphone' ? 'Microphone' : 'Camera'} permission was denied. Allow access in your browser or device settings and try again.`;
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return `No ${media} was found. Connect or enable a device and try again.`;
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
        return `The ${media} is already in use or unavailable. Close other apps using it and try again.`;
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        return `The selected ${media} does not support the requested settings.`;
    }
    if (name === 'AbortError') {
        return `The ${media} could not be started. Please try again.`;
    }
    return `Unable to access the ${media}. Check its permission and device availability.`;
};
