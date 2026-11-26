import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioEngine } from './audioEngine';

const makeParam = (value = 0) => ({
    value,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
});

class FakeAudioContext {
    state: AudioContextState = 'suspended';
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => { this.state = 'running'; });
    close = vi.fn(async () => { this.state = 'closed'; });
    createAnalyser = vi.fn(() => ({ fftSize: 0, smoothingTimeConstant: 0, connect: vi.fn() }));
    createDynamicsCompressor = vi.fn(() => ({
        threshold: makeParam(), knee: makeParam(), ratio: makeParam(),
        attack: makeParam(), release: makeParam(), connect: vi.fn(),
    }));
    createGain = vi.fn(() => ({ gain: makeParam(1), connect: vi.fn() }));
    createBiquadFilter = vi.fn(() => ({
        type: 'peaking', frequency: makeParam(), Q: makeParam(1), gain: makeParam(), connect: vi.fn(),
    }));
}

describe('AudioEngine lifecycle recovery', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('resumes a suspended Web Audio graph after a background/lock transition', async () => {
        vi.stubGlobal('window', {
            AudioContext: FakeAudioContext,
        });

        const context = audioEngine.initContext() as unknown as FakeAudioContext;
        expect(context).not.toBeNull();
        expect(context.state).toBe('suspended');

        await expect(audioEngine.resume()).resolves.toBe(true);
        expect(context.resume).toHaveBeenCalledOnce();
        expect(context.state).toBe('running');
    });

    it('reports a deferred resume when the browser rejects background recovery', async () => {
        const context = audioEngine.getAudioContext() as unknown as FakeAudioContext;
        context.state = 'suspended';
        context.resume.mockRejectedValueOnce(new Error('resume requires user activation'));

        await expect(audioEngine.resume()).resolves.toBe(false);
    });
});
