import { FREQUENCIES } from '../constants/equalizer';

/**
 * Validates whether a media URL is guaranteed to be safe for Web Audio capture via CORS.
 *
 * Requirements:
 * - Local blob URLs (offline downloads) are same-origin and safe.
 * - JioSaavn CDN domains that serve `Access-Control-Allow-Origin: *` are safe.
 * - Exact hostname matching using standard URL API prevents domain spoofing.
 */
export function isWebAudioEligibleSource(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;

    // Offline downloaded tracks use blob URLs, which are same-origin
    if (urlStr.startsWith('blob:')) return true;

    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

        const hostname = parsed.hostname.toLowerCase();

        // Exact allowed hostnames for JioSaavn media distribution
        const allowedExactHosts = new Set([
            'saavncdn.com',
            'jiosaavn.com',
            'cdn.jio.com',
        ]);

        if (allowedExactHosts.has(hostname)) return true;

        // Subdomain matching (e.g. aac.saavncdn.com, c.saavncdn.com, media.saavn.cdn.jio.com)
        if (
            hostname.endsWith('.saavncdn.com') ||
            hostname.endsWith('.jiosaavn.com') ||
            hostname.endsWith('.cdn.jio.com')
        ) {
            return true;
        }

        // Same-origin check for self-hosted or proxied environments
        if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * AudioEngine - Centralized Web Audio Graph Manager
 *
 * Topology:
 * MediaElementSource -> 10-Band EQ (BiquadFilters) -> Booster (GainNode) -> Soft Limiter (DynamicsCompressorNode) -> AnalyserNode -> Destination
 *
 * Highlights:
 * - Singleton AudioContext with state-suspended resumption on user gesture.
 * - WeakMap caching of MediaElementAudioSourceNode per HTMLAudioElement to prevent duplicate source exceptions.
 * - Software amplification (1.0x to 2.0x) applied safely via booster GainNode.
 * - DynamicsCompressorNode attenuates excessive peaks during amplification (soft limiter, not brick-wall).
 * - Safe error handling: If an element cannot be connected, native playback is unblocked.
 */
class AudioEngine {
    private static instance: AudioEngine;

    private context: AudioContext | null = null;
    private boosterGainNode: GainNode | null = null;
    private compressorNode: DynamicsCompressorNode | null = null;
    private analyserNode: AnalyserNode | null = null;
    private eqFilters: BiquadFilterNode[] = [];
    private elementSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
    private capturedElements = new WeakSet<HTMLAudioElement>();
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): AudioEngine {
        if (!AudioEngine.instance) {
            AudioEngine.instance = new AudioEngine();
        }
        return AudioEngine.instance;
    }

    public getAudioContext(): AudioContext | null {
        return this.context;
    }

    public getAnalyser(): AnalyserNode | null {
        return this.analyserNode;
    }

    public isElementCaptured(el: HTMLAudioElement): boolean {
        return this.capturedElements.has(el);
    }

    public initContext(): AudioContext | null {
        if (this.isInitialized && this.context) {
            if (this.context.state === 'suspended') {
                this.context.resume().catch(() => {});
            }
            return this.context;
        }

        try {
            if (typeof window === 'undefined') return null;
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return null;

            this.context = new AudioContextClass();

            // 1. Analyser Node for Visualizer
            this.analyserNode = this.context.createAnalyser();
            this.analyserNode.fftSize = 512;
            this.analyserNode.smoothingTimeConstant = 0.8;

            // 2. Soft Limiter / Compressor to protect against digital distortion
            this.compressorNode = this.context.createDynamicsCompressor();
            this.compressorNode.threshold.value = -3.0; // dB
            this.compressorNode.knee.value = 6.0; // soft knee
            this.compressorNode.ratio.value = 12.0; // firm compression above threshold
            this.compressorNode.attack.value = 0.003; // fast attack (3ms)
            this.compressorNode.release.value = 0.15; // 150ms release

            // 3. Booster Gain Node (1.0x to 2.0x amplification)
            this.boosterGainNode = this.context.createGain();
            this.boosterGainNode.gain.value = 1.0;

            // 4. 10-Band EQ Filters
            this.eqFilters = FREQUENCIES.map(freq => {
                const filter = this.context!.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = 0;
                return filter;
            });

            // Connect EQ Filters in series
            for (let i = 0; i < this.eqFilters.length - 1; i++) {
                this.eqFilters[i].connect(this.eqFilters[i + 1]);
            }

            // Topology:
            // Last EQ Filter -> Booster Gain -> Compressor (Limiter) -> Analyser -> Destination
            if (this.eqFilters.length > 0) {
                const lastEq = this.eqFilters[this.eqFilters.length - 1];
                lastEq.connect(this.boosterGainNode);
            }
            this.boosterGainNode.connect(this.compressorNode);
            this.compressorNode.connect(this.analyserNode);
            this.analyserNode.connect(this.context.destination);

            this.isInitialized = true;
            return this.context;
        } catch (err) {
            console.warn('[AudioEngine] Web Audio initialization failed or not supported:', err);
            return null;
        }
    }

    public registerAudioElement(audioEl: HTMLAudioElement): boolean {
        const ctx = this.initContext();
        if (!ctx || !this.eqFilters[0]) return false;

        if (this.elementSources.has(audioEl)) {
            return true;
        }

        try {
            // Ensure audio element has crossOrigin attribute set prior to stream decoding
            if (!audioEl.crossOrigin) {
                audioEl.crossOrigin = 'anonymous';
            }
            // Attempt to create media element source node
            const sourceNode = ctx.createMediaElementSource(audioEl);
            // Connect to first EQ filter
            sourceNode.connect(this.eqFilters[0]);
            this.elementSources.set(audioEl, sourceNode);
            this.capturedElements.add(audioEl);
            return true;
        } catch (err) {
            console.warn('[AudioEngine] Could not attach MediaElementAudioSourceNode (falling back to unboosted native audio):', err);
            return false;
        }
    }

    public setBoosterGain(multiplier: number) {
        if (!this.boosterGainNode || !this.context) return;
        // Clamp multiplier between 1.0 and 2.0 for Web Audio software boost
        const safeMultiplier = Math.min(2.0, Math.max(1.0, multiplier));
        const now = this.context.currentTime;
        this.boosterGainNode.gain.cancelScheduledValues(now);
        this.boosterGainNode.gain.setValueAtTime(this.boosterGainNode.gain.value, now);
        this.boosterGainNode.gain.linearRampToValueAtTime(safeMultiplier, now + 0.05);
    }

    public updateEqualizer(bands: number[], enabled: boolean) {
        if (!this.isInitialized || this.eqFilters.length === 0) return;
        this.eqFilters.forEach((filter, idx) => {
            const gain = enabled && bands[idx] !== undefined ? bands[idx] : 0;
            filter.gain.value = gain;
        });
    }

    public resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
        }
    }
}

export const audioEngine = AudioEngine.getInstance();
