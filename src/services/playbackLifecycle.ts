export interface PlaybackLifecycleRecoveryOptions {
    isPlaying: boolean;
    audio: Pick<HTMLMediaElement, 'paused' | 'play'> | null;
    audioContextState?: AudioContextState;
    resumeAudioContext: () => Promise<boolean>;
}

export interface PlaybackLifecycleRecoveryResult {
    attempted: boolean;
    audioContextResumed: boolean;
}

/**
 * Recover a playing media element after Android backgrounds/locks the app.
 * AudioContext recovery is independent from HTMLMediaElement playback, so
 * both states are checked instead of assuming one implies the other.
 */
export async function recoverPlaybackAfterLifecycle(
    options: PlaybackLifecycleRecoveryOptions
): Promise<PlaybackLifecycleRecoveryResult> {
    const { isPlaying, audio, audioContextState, resumeAudioContext } = options;
    if (!isPlaying || !audio) {
        return { attempted: false, audioContextResumed: true };
    }

    let audioContextResumed = true;
    if (audioContextState && audioContextState !== 'running' && audioContextState !== 'closed') {
        audioContextResumed = await resumeAudioContext();
    }

    if (audio.paused) {
        await audio.play();
    }

    return { attempted: true, audioContextResumed };
}
