import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';
import { FREQUENCIES } from '../constants/equalizer';

interface VisualizerProps {
    audioRefs: React.RefObject<HTMLAudioElement>[];
    isPlaying: boolean;
}

// Singleton Audio Graph
let sharedContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedFilters: BiquadFilterNode[] = [];
let isInitialized = false;

const Visualizer: React.FC<VisualizerProps> = ({ audioRefs, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const smoothedValuesRef = useRef<number[]>([]);
    const peaksRef = useRef<number[]>([]);
    const particlesRef = useRef<any[]>([]);
    const accentColorRef = useRef<string>('#ef4444');
    const { equalizerSettings, visualizerStyle } = useAppSelector(state => state.musicPlayer);

    useEffect(() => {
        const updateAccentColor = () => {
            const color = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
            if (color) accentColorRef.current = color;
        };
        updateAccentColor();
        const interval = setInterval(updateAccentColor, 1000);
        return () => clearInterval(interval);
    }, []);

    const setupAudioSource = (audioEl: HTMLAudioElement, context: AudioContext, firstFilter: BiquadFilterNode) => {
        const el = audioEl as any;
        if (el._visualizerSource) return;

        try {
            const source = context.createMediaElementSource(audioEl);
            const gainNode = context.createGain();

            source.connect(gainNode);
            gainNode.connect(firstFilter);

            el._visualizerSource = source;
            el._gainNode = gainNode;
            el._visualizerContext = context;
        } catch (e) {
            console.error("Error setting up audio source", e);
        }
    };

    const initAudio = () => {
        if (isInitialized) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            sharedContext = new AudioContextClass();

            sharedAnalyser = sharedContext.createAnalyser();
            sharedAnalyser.fftSize = 512;
            sharedAnalyser.smoothingTimeConstant = 0.8;

            sharedFilters = FREQUENCIES.map((freq, i) => {
                const filter = sharedContext!.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
                return filter;
            });

            for (let i = 0; i < sharedFilters.length - 1; i++) {
                sharedFilters[i].connect(sharedFilters[i + 1]);
            }

            sharedFilters[sharedFilters.length - 1].connect(sharedAnalyser);
            sharedAnalyser.connect(sharedContext.destination);

            isInitialized = true;
        } catch (err) {
            console.warn('Failed to initialize audio visualizer singleton:', err);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            initAudio();
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
        }

        const handleFirstInteraction = () => {
            initAudio();
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
            document.removeEventListener('click', handleFirstInteraction);
        };

        document.addEventListener('click', handleFirstInteraction);

        if (isInitialized && sharedContext && sharedFilters[0]) {
            audioRefs.forEach(ref => {
                if (ref.current) {
                    setupAudioSource(ref.current, sharedContext!, sharedFilters[0]);
                }
            });
        }

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
        };
    }, [audioRefs, isPlaying]);

    useEffect(() => {
        if (isInitialized && sharedFilters.length > 0) {
            sharedFilters.forEach((filter, i) => {
                filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
            });
        }
    }, [equalizerSettings]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sharedAnalyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = sharedAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            sharedAnalyser!.getByteFrequencyData(dataArray);

            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== canvas.clientWidth * dpr || canvas.height !== canvas.clientHeight * dpr) {
                canvas.width = canvas.clientWidth * dpr;
                canvas.height = canvas.clientHeight * dpr;
                ctx.scale(dpr, dpr);
            }

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            ctx.clearRect(0, 0, width, height);

            const accentColor = accentColorRef.current;
            const shadowIntensity = 15;

            if (visualizerStyle === 'bars') {
                const numBars = 64;
                const barWidth = width / numBars;

                if (smoothedValuesRef.current.length !== numBars) {
                    smoothedValuesRef.current = new Array(numBars).fill(0);
                    peaksRef.current = new Array(numBars).fill(0);
                }

                for (let i = 0; i < numBars; i++) {
                    const minFreq = 20;
                    const maxFreq = 16000;
                    const freq = minFreq * Math.pow(maxFreq / minFreq, i / numBars);
                    const binIndex = Math.floor(freq * sharedAnalyser!.fftSize / sharedContext!.sampleRate);
                    const average = dataArray[Math.min(binIndex, bufferLength - 1)];

                    const boost = 1 + (i / numBars) * 1.5;
                    const targetHeight = (average / 255) * height * 0.8 * boost;

                    smoothedValuesRef.current[i] += (targetHeight - smoothedValuesRef.current[i]) * 0.2;
                    const barHeight = Math.max(2, smoothedValuesRef.current[i]);

                    ctx.shadowBlur = shadowIntensity;
                    ctx.shadowColor = accentColor;

                    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    gradient.addColorStop(0, `${accentColor}11`);
                    gradient.addColorStop(0.4, `${accentColor}66`);
                    gradient.addColorStop(1, accentColor);

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    const centerY = height / 2;
                    const centeredBarHeight = Math.max(4, barHeight);
                    if (ctx.roundRect) {
                        ctx.roundRect(i * barWidth + 1, centerY - centeredBarHeight / 2, barWidth - 3, centeredBarHeight, [barWidth / 2]);
                    } else {
                        ctx.rect(i * barWidth + 1, centerY - centeredBarHeight / 2, barWidth - 3, centeredBarHeight);
                    }
                    ctx.fill();

                    if (barHeight > peaksRef.current[i]) {
                        peaksRef.current[i] = barHeight;
                    } else {
                        peaksRef.current[i] -= 0.8;
                    }

                    if (peaksRef.current[i] > 2) {
                        ctx.fillStyle = `${accentColor}CC`;
                        const peakYTop = centerY - peaksRef.current[i] / 2 - 4;
                        const peakYBottom = centerY + peaksRef.current[i] / 2 + 2;
                        ctx.fillRect(i * barWidth + 1, peakYTop, barWidth - 3, 2);
                        ctx.fillRect(i * barWidth + 1, peakYBottom, barWidth - 3, 2);
                    }
                }
                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'waveform') {
                sharedAnalyser!.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 4;
                ctx.strokeStyle = accentColor;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowBlur = shadowIntensity;
                ctx.shadowColor = accentColor;

                ctx.beginPath();
                const sliceWidth = width / (bufferLength - 1);
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * height) / 2;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        const nextX = x + sliceWidth;
                        const nextV = dataArray[i+1] / 128.0;
                        const nextY = (nextV * height) / 2;
                        const xc = (x + nextX) / 2;
                        const yc = (y + nextY) / 2;
                        ctx.quadraticCurveTo(x, y, xc, yc);
                    }
                    x += sliceWidth;
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'particles') {
                if (particlesRef.current.length === 0) {
                    for (let i = 0; i < 150; i++) {
                        particlesRef.current.push({
                            x: Math.random() * width,
                            y: Math.random() * height,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: (Math.random() - 0.5) * 1.5,
                            size: Math.random() * 2 + 1,
                            bin: Math.floor(Math.pow(Math.random(), 2) * bufferLength)
                        });
                    }
                }

                ctx.globalCompositeOperation = 'screen';
                particlesRef.current.forEach(p => {
                    const value = dataArray[p.bin];
                    const percent = value / 255;
                    p.y -= (percent * 4) + 0.3;
                    p.x += p.vx * (0.5 + percent * 2);

                    if (p.y < -20) {
                        p.y = height + 20;
                        p.x = Math.random() * width;
                    }
                    if (p.x < -20) p.x = width + 20;
                    if (p.x > width + 20) p.x = -20;

                    const size = p.size * (1 + percent * 5);
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
                    grad.addColorStop(0, accentColor);
                    grad.addColorStop(0.4, `${accentColor}66`);
                    grad.addColorStop(1, 'transparent');

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.globalCompositeOperation = 'source-over';
            } else if (visualizerStyle === 'circular') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.22;

                // Center Glow
                const lowFreqSum = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
                const pulse = (lowFreqSum / 255) * 25;

                const centerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + pulse);
                centerGrad.addColorStop(0, `${accentColor}44`);
                centerGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = centerGrad;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + pulse, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 20;
                ctx.shadowColor = accentColor;

                const numBars = 120;
                for (let i = 0; i < numBars; i++) {
                    const angle = (i / numBars) * Math.PI * 2;
                    const binIndex = Math.floor((i / numBars) * (bufferLength / 2));
                    const value = dataArray[binIndex];
                    const barHeight = (value / 255) * height * 0.35;

                    const x1 = centerX + Math.cos(angle) * (radius + pulse);
                    const y1 = centerY + Math.sin(angle) * (radius + pulse);
                    const x2 = centerX + Math.cos(angle) * (radius + pulse + barHeight);
                    const y2 = centerY + Math.sin(angle) * (radius + pulse + barHeight);

                    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                    grad.addColorStop(0, `${accentColor}66`);
                    grad.addColorStop(1, accentColor);

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // Orbital Sparks
                if (particlesRef.current.length < 50) {
                    particlesRef.current.push({
                        angle: Math.random() * Math.PI * 2,
                        distance: radius + 20,
                        speed: (Math.random() - 0.5) * 0.02,
                        size: Math.random() * 2 + 1
                    });
                }

                particlesRef.current.forEach((p, i) => {
                    p.angle += p.speed * (1 + lowFreqSum / 255);
                    const dist = p.distance + (lowFreqSum / 255) * 40;
                    const px = centerX + Math.cos(p.angle) * dist;
                    const py = centerY + Math.sin(p.angle) * dist;

                    ctx.fillStyle = accentColor;
                    ctx.beginPath();
                    ctx.arc(px, py, p.size, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'pixel') {
                const gridSize = 14;
                const cols = Math.floor(width / gridSize);
                const rows = Math.floor(height / gridSize);
                const centerY = Math.floor(rows / 2);

                for (let i = 0; i < cols; i++) {
                    const binIndex = Math.floor((i / cols) * (bufferLength / 2));
                    const value = dataArray[binIndex];
                    const activeRows = Math.floor((value / 255) * rows);

                    for (let j = 0; j < activeRows; j++) {
                        const rowIdx = j % 2 === 0 ? centerY - Math.floor(j/2) : centerY + Math.floor(j/2);
                        if (rowIdx < 0 || rowIdx >= rows) continue;

                        const alpha = Math.max(0.2, 1 - (j / rows));
                        ctx.fillStyle = `${accentColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = accentColor;
                        ctx.fillRect(i * gridSize + 1, rowIdx * gridSize + 1, gridSize - 3, gridSize - 3);
                    }
                }
                ctx.shadowBlur = 0;
            }
        };

        if (isPlaying) {
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
            draw();
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, visualizerStyle]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                className="w-full h-full opacity-60 pointer-events-none"
                aria-hidden="true"
            />
        </div>
    );
};

export default Visualizer;
