import { describe, expect, it, vi } from 'vitest';
import { recoverPlaybackAfterLifecycle } from './playbackLifecycle';

describe('Android lock-screen playback recovery', () => {
    it('resumes a suspended Web Audio graph and a paused media element', async () => {
        const audio = { paused: true, play: vi.fn(async () => undefined) };
        const resumeAudioContext = vi.fn(async () => true);

        const result = await recoverPlaybackAfterLifecycle({
            isPlaying: true,
            audio,
            audioContextState: 'suspended',
            resumeAudioContext,
        });

        expect(resumeAudioContext).toHaveBeenCalledOnce();
        expect(audio.play).toHaveBeenCalledOnce();
        expect(result).toEqual({ attempted: true, audioContextResumed: true });
    });

    it('still attempts HTML media playback when Web Audio resume is deferred', async () => {
        const audio = { paused: true, play: vi.fn(async () => undefined) };

        const result = await recoverPlaybackAfterLifecycle({
            isPlaying: true,
            audio,
            audioContextState: 'suspended',
            resumeAudioContext: vi.fn(async () => false),
        });

        expect(audio.play).toHaveBeenCalledOnce();
        expect(result.audioContextResumed).toBe(false);
    });

    it('does not restart audio after the user has paused playback', async () => {
        const audio = { paused: true, play: vi.fn(async () => undefined) };
        const resumeAudioContext = vi.fn(async () => true);

        const result = await recoverPlaybackAfterLifecycle({
            isPlaying: false,
            audio,
            audioContextState: 'suspended',
            resumeAudioContext,
        });

        expect(resumeAudioContext).not.toHaveBeenCalled();
        expect(audio.play).not.toHaveBeenCalled();
        expect(result.attempted).toBe(false);
    });
});
