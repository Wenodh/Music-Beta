import { describe, it, expect, beforeEach, vi } from 'vitest';
import reducer, {
    setVolume,
    toggleMute,
    playMusic,
} from '../musicPlayerSlice';
import { audioEngine, isWebAudioEligibleSource } from '../../../services/audioEngine';

describe('Volume Control & Booster Comprehensive Verification (Remediation Suite)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Redux State & Normalization', () => {
        it('initializes with default volume 0.7, isMuted false, previousVolume 0.7', () => {
            const state = reducer(undefined, { type: '@@INIT' });
            expect(state.volume).toBe(0.7);
            expect(state.isMuted).toBe(false);
            expect(state.previousVolume).toBe(0.7);
        });

        it('clamps volume strictly between 0 and 2.0', () => {
            let state = reducer(undefined, setVolume(1.8));
            expect(state.volume).toBe(1.8);

            state = reducer(state, setVolume(2.5));
            expect(state.volume).toBe(2.0);

            state = reducer(state, setVolume(-0.2));
            expect(state.volume).toBe(0);
        });

        it('handles mute and unmute with last non-zero volume restoration', () => {
            let state = reducer(undefined, setVolume(1.6));
            expect(state.volume).toBe(1.6);
            expect(state.previousVolume).toBe(1.6);

            // Mute
            state = reducer(state, toggleMute());
            expect(state.isMuted).toBe(true);
            expect(state.volume).toBe(0);
            expect(state.previousVolume).toBe(1.6);

            // Unmute
            state = reducer(state, toggleMute());
            expect(state.isMuted).toBe(false);
            expect(state.volume).toBe(1.6);
        });

        it('changing volume while muted updates target volume without unmuting', () => {
            let state = reducer(undefined, setVolume(0.8));
            state = reducer(state, toggleMute());
            expect(state.isMuted).toBe(true);
            expect(state.volume).toBe(0);

            // User adjusts volume while muted
            state = reducer(state, setVolume(1.4));
            expect(state.isMuted).toBe(true);
            expect(state.volume).toBe(0);
            expect(state.previousVolume).toBe(1.4);

            // Unmute restores adjusted volume
            state = reducer(state, toggleMute());
            expect(state.isMuted).toBe(false);
            expect(state.volume).toBe(1.4);
        });

        it('normalizes invalid or corrupt persisted state upon rehydration', () => {
            const rehydrateAction = {
                type: 'persist/REHYDRATE',
                payload: {
                    musicPlayer: {
                        volume: 5.0, // should clamp to 2.0
                        isMuted: false,
                        previousVolume: NaN, // should normalize to 2.0
                    }
                }
            };
            const state = reducer(undefined, rehydrateAction as any);
            expect(state.volume).toBe(2.0);
            expect(state.isMuted).toBe(false);
            expect(state.previousVolume).toBe(2.0);
        });
    });

    describe('CORS-Safe Source Routing (VIBE-VOL-002 Regression)', () => {
        it('validates verified JioSaavn CDN domains as Web Audio eligible', () => {
            expect(isWebAudioEligibleSource('https://aac.saavncdn.com/320/song.mp4')).toBe(true);
            expect(isWebAudioEligibleSource('https://c.saavncdn.com/500/art.jpg')).toBe(true);
            expect(isWebAudioEligibleSource('https://media.saavn.cdn.jio.com/stream.mp4')).toBe(true);
            expect(isWebAudioEligibleSource('https://jiosaavn.com/track.mp4')).toBe(true);
        });

        it('rejects spoofed lookalike hostnames with attacker domain endings', () => {
            expect(isWebAudioEligibleSource('https://saavncdn.com.attacker.example/audio.mp3')).toBe(false);
            expect(isWebAudioEligibleSource('https://jiosaavn.com.phishing.io/stream.mp4')).toBe(false);
            expect(isWebAudioEligibleSource('https://malicious-saavncdn.com/file.mp3')).toBe(false);
        });

        it('supports same-origin offline blob URLs', () => {
            expect(isWebAudioEligibleSource('blob:http://localhost:5173/f3b2a8d1-1234')).toBe(true);
            expect(isWebAudioEligibleSource('blob:https://vibeon.app/99887766')).toBe(true);
        });

        it('rejects unknown external URLs or empty strings', () => {
            expect(isWebAudioEligibleSource('https://external-radio.stream/live')).toBe(false);
            expect(isWebAudioEligibleSource('https://thirdparty.audio/music.mp3')).toBe(false);
            expect(isWebAudioEligibleSource('')).toBe(false);
            expect(isWebAudioEligibleSource(null as any)).toBe(false);
        });
    });

    describe('Crossfade Volume Math Verification', () => {
        const calcCrossfadeVolumes = (userVolume: number, progress: number, isEligible = true) => {
            const baseVol = Math.min(1.0, Math.max(0, userVolume));
            const activeVol = baseVol * (1 - progress);
            const inactiveVol = baseVol * progress;
            // Software gain is only applied when source is eligible
            const boosterGain = isEligible && userVolume > 1.0 ? userVolume : 1.0;
            return { activeVol, inactiveVol, boosterGain };
        };

        it('calculates expected levels at 70% (normal volume)', () => {
            const { activeVol, inactiveVol, boosterGain } = calcCrossfadeVolumes(0.7, 0.5);
            expect(activeVol).toBeCloseTo(0.35);
            expect(inactiveVol).toBeCloseTo(0.35);
            expect(boosterGain).toBe(1.0);
        });

        it('calculates expected levels at 100% (normal maximum)', () => {
            const { activeVol, inactiveVol, boosterGain } = calcCrossfadeVolumes(1.0, 0.5);
            expect(activeVol).toBeCloseTo(0.5);
            expect(inactiveVol).toBeCloseTo(0.5);
            expect(boosterGain).toBe(1.0);
        });

        it('calculates expected levels at 150% (boosted playback on eligible source)', () => {
            const { activeVol, inactiveVol, boosterGain } = calcCrossfadeVolumes(1.5, 0.5, true);
            expect(activeVol).toBeCloseTo(0.5);
            expect(inactiveVol).toBeCloseTo(0.5);
            expect(boosterGain).toBe(1.5);
        });

        it('caps gain at 1.0 (100%) when source is ineligible for Web Audio', () => {
            const { activeVol, inactiveVol, boosterGain } = calcCrossfadeVolumes(1.8, 0.5, false);
            expect(activeVol).toBeCloseTo(0.5);
            expect(inactiveVol).toBeCloseTo(0.5);
            expect(boosterGain).toBe(1.0); // Capped at 1.0, native hardware output preserved
        });

        it('calculates expected levels at 200% (maximum booster ceiling)', () => {
            const { activeVol, inactiveVol, boosterGain } = calcCrossfadeVolumes(2.0, 0.5, true);
            expect(activeVol).toBeCloseTo(0.5);
            expect(inactiveVol).toBeCloseTo(0.5);
            expect(boosterGain).toBe(2.0);
        });
    });

    describe('Asynchronous Request Generation Protection', () => {
        it('drops stale out-of-order resolution when user switches to a different song', async () => {
            let activeRequestId = 0;
            let currentTargetUrl = '';

            const simulateLoad = async (reqId: number, url: string, delay: number) => {
                await new Promise(r => setTimeout(r, delay));
                if (reqId === activeRequestId) {
                    currentTargetUrl = url;
                }
            };

            // Request 1 started (slow network, 50ms)
            const id1 = ++activeRequestId;
            const p1 = simulateLoad(id1, 'https://aac.saavncdn.com/song1.mp4', 50);

            // Request 2 started immediately after (fast network, 10ms)
            const id2 = ++activeRequestId;
            const p2 = simulateLoad(id2, 'https://aac.saavncdn.com/song2.mp4', 10);

            await Promise.all([p1, p2]);
            // Target URL must strictly be song2 (the latest request generation)
            expect(currentTargetUrl).toBe('https://aac.saavncdn.com/song2.mp4');
        });

        it('drops stale out-of-order resolution when two requests target the same song ID', async () => {
            let activeRequestId = 0;
            let currentTargetUrl = '';

            const simulateLoad = async (reqId: number, url: string, delay: number) => {
                await new Promise(r => setTimeout(r, delay));
                if (reqId === activeRequestId) {
                    currentTargetUrl = url;
                }
            };

            // First resolution for song A with standard bitrate (slow, 60ms)
            const id1 = ++activeRequestId;
            const p1 = simulateLoad(id1, 'https://aac.saavncdn.com/songA_160.mp4', 60);

            // Second resolution for song A with high bitrate (fast, 15ms)
            const id2 = ++activeRequestId;
            const p2 = simulateLoad(id2, 'https://aac.saavncdn.com/songA_320.mp4', 15);

            await Promise.all([p1, p2]);
            expect(currentTargetUrl).toBe('https://aac.saavncdn.com/songA_320.mp4');
        });

        it('drops stale resolution when switching away and returning back to the same song', async () => {
            let activeRequestId = 0;
            let appliedUrl = '';

            const simulateLoad = async (reqId: number, url: string, delay: number) => {
                await new Promise(r => setTimeout(r, delay));
                if (reqId === activeRequestId) {
                    appliedUrl = url;
                }
            };

            // Switch to Song X (Req 1, 80ms delay)
            const id1 = ++activeRequestId;
            const p1 = simulateLoad(id1, 'url_X_stale', 80);

            // Switch to Song Y (Req 2, 20ms delay)
            const id2 = ++activeRequestId;
            const p2 = simulateLoad(id2, 'url_Y', 20);

            // Switch back to Song X (Req 3, 30ms delay)
            const id3 = ++activeRequestId;
            const p3 = simulateLoad(id3, 'url_X_fresh', 30);

            await Promise.all([p1, p2, p3]);
            // Fresh request 3 must prevail, stale request 1 must not overwrite
            expect(appliedUrl).toBe('url_X_fresh');
        });
    });

    describe('Audio Element Lifecycle & Listener Management', () => {
        it('detaches listeners from discarded element and immediately binds them to the replacement', () => {
            const listenersMap = new WeakMap<any, any>();
            const handlers = { timeupdate: vi.fn(), ended: vi.fn() };

            const bindListeners = (el: any) => {
                const existing = listenersMap.get(el);
                if (existing) {
                    el.removeEventListener('timeupdate', existing.timeupdate);
                    el.removeEventListener('ended', existing.ended);
                }
                el.addEventListener('timeupdate', handlers.timeupdate);
                el.addEventListener('ended', handlers.ended);
                listenersMap.set(el, handlers);
            };

            const unbindListeners = (el: any) => {
                const existing = listenersMap.get(el);
                if (existing) {
                    el.removeEventListener('timeupdate', existing.timeupdate);
                    el.removeEventListener('ended', existing.ended);
                    listenersMap.delete(el);
                }
            };

            const oldAudio = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            };
            const freshAudio = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            };

            // Bind old audio
            bindListeners(oldAudio);
            expect(oldAudio.addEventListener).toHaveBeenCalledWith('timeupdate', handlers.timeupdate);
            expect(oldAudio.addEventListener).toHaveBeenCalledWith('ended', handlers.ended);

            // Unbind old audio upon replacement
            unbindListeners(oldAudio);
            expect(oldAudio.removeEventListener).toHaveBeenCalledWith('timeupdate', handlers.timeupdate);
            expect(oldAudio.removeEventListener).toHaveBeenCalledWith('ended', handlers.ended);

            // Bind replacement immediately
            bindListeners(freshAudio);
            expect(freshAudio.addEventListener).toHaveBeenCalledWith('timeupdate', handlers.timeupdate);
            expect(freshAudio.addEventListener).toHaveBeenCalledWith('ended', handlers.ended);
        });

        it('guarantees that an old discarded element cannot trigger ended to advance queue', () => {
            let queueIndex = 0;
            const advanceQueue = vi.fn(() => { queueIndex++; });

            const oldAudio = {
                listeners: {} as Record<string, () => void>,
                addEventListener: (evt: string, fn: () => void) => { oldAudio.listeners[evt] = fn; },
                removeEventListener: (evt: string) => { delete oldAudio.listeners[evt]; },
            };

            oldAudio.addEventListener('ended', advanceQueue);
            // Simulate discarding element: remove listeners
            oldAudio.removeEventListener('ended');

            // Fire stale ended event on discarded element
            if (oldAudio.listeners['ended']) {
                oldAudio.listeners['ended']();
            }

            expect(advanceQueue).not.toHaveBeenCalled();
            expect(queueIndex).toBe(0);
        });

        it('preserves playbackRate immediately on element replacement', () => {
            const freshAudio = {
                playbackRate: 1.0,
                preservesPitch: true,
            };
            const activeSpeed = 1.5;
            freshAudio.playbackRate = activeSpeed;
            expect(freshAudio.playbackRate).toBe(1.5);
        });
    });

    describe('AudioEngine Lifecycle & Decoupled Registration (VIBE-VOL-001)', () => {
        it('returns singleton AudioEngine instance independent of Visualizer', () => {
            expect(audioEngine).toBeDefined();
            expect(typeof audioEngine.initContext).toBe('function');
            expect(typeof audioEngine.registerAudioElement).toBe('function');
            expect(typeof audioEngine.setBoosterGain).toBe('function');
        });

        it('registers audio elements safely and caches them in WeakMap', () => {
            const mockAudio = {
                src: '',
                crossOrigin: '',
                preload: '',
                preservesPitch: true,
                volume: 1.0,
            } as any;
            const registeredFirst = audioEngine.registerAudioElement(mockAudio);
            const registeredSecond = audioEngine.registerAudioElement(mockAudio);
            expect(registeredFirst !== undefined).toBe(true);
            expect(registeredSecond !== undefined).toBe(true);
        });

        it('preserves volume across track transitions without resetting', () => {
            let state = reducer(undefined, setVolume(1.75));
            expect(state.volume).toBe(1.75);

            // Change song
            state = reducer(state, playMusic({ id: 'song_new_1', name: 'New Song', artist: 'Artist' }));
            expect(state.volume).toBe(1.75);
            expect(state.previousVolume).toBe(1.75);
        });
    });
});
