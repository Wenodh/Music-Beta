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
    const { equalizerSettings, visualizerStyle } = useAppSelector(state => state.musicPlayer);

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

            // Create shared filters (EQ)
            sharedFilters = FREQUENCIES.map((freq, i) => {
                const filter = sharedContext!.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
                return filter;
            });

            // Connect filters in series
            for (let i = 0; i < sharedFilters.length - 1; i++) {
                sharedFilters[i].connect(sharedFilters[i + 1]);
            }

            // Last filter connects to analyser
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

        // Re-check refs on update
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

            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#ef4444';

            if (visualizerStyle === 'bars') {
                const barWidth = (width / bufferLength) * 2.5;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * height * 0.8;

                    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    gradient.addColorStop(0, `${accentColor}40`);
                    gradient.addColorStop(1, accentColor);

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
                    ctx.fill();
                    x += barWidth;
                }
            } else if (visualizerStyle === 'waveform') {
                sharedAnalyser!.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 3;
                ctx.strokeStyle = accentColor;
                ctx.beginPath();

                const sliceWidth = width / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * height) / 2;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                ctx.lineTo(width, height / 2);
                ctx.stroke();
            } else if (visualizerStyle === 'particles') {
                for (let i = 0; i < bufferLength; i += 8) {
                    const value = dataArray[i];
                    const percent = value / 255;
                    const radius = percent * 15;
                    const x = (i / bufferLength) * width;
                    const y = height - (percent * height);

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = `${accentColor}${Math.floor(percent * 255).toString(16).padStart(2, '0')}`;
                    ctx.fill();
                }
            } else if (visualizerStyle === 'circular') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.2;

                for (let i = 0; i < bufferLength; i++) {
                    const angle = (i / bufferLength) * Math.PI * 2;
                    const value = dataArray[i];
                    const barHeight = (value / 255) * height * 0.2;

                    const x1 = centerX + Math.cos(angle) * radius;
                    const y1 = centerY + Math.sin(angle) * radius;
                    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

                    ctx.strokeStyle = accentColor;
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            } else if (visualizerStyle === 'pixel') {
                const gridSize = 16;
                const cols = Math.floor(width / gridSize);
                const rows = Math.floor(height / gridSize);

                for (let i = 0; i < cols; i++) {
                    const dataIndex = Math.floor((i / cols) * bufferLength);
                    const value = dataArray[dataIndex];
                    const activeRows = Math.floor((value / 255) * rows);

                    for (let j = 0; j < activeRows; j++) {
                        ctx.fillStyle = `${accentColor}${Math.floor((j / rows) * 255).toString(16).padStart(2, '0')}`;
                        ctx.fillRect(i * gridSize + 2, height - (j * gridSize) - gridSize + 2, gridSize - 4, gridSize - 4);
                    }
                }
            }
        };

        if (isPlaying) {
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
            draw();
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isPlaying, visualizerStyle]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                width={100}
                height={40}
                className="w-full h-full opacity-50 pointer-events-none"
                aria-hidden="true"
                role="presentation"
            />
        </div>
    );
};

export default Visualizer;
