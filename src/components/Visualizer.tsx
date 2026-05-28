import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';
import { FREQUENCIES } from '../constants/equalizer';

interface VisualizerProps {
    audioRefs: React.RefObject<HTMLAudioElement>[];
    isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioRefs, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const filtersRef = useRef<BiquadFilterNode[]>([]);
    const { equalizerSettings, visualizerStyle } = useAppSelector(state => state.musicPlayer);

    useEffect(() => {
        const initAudio = () => {
            if (analyserRef.current) return;

            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const context = new AudioContextClass();
                contextRef.current = context;

                const analyser = context.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;
                analyserRef.current = analyser;

                // Create shared filters (EQ)
                const filters = FREQUENCIES.map((freq, i) => {
                    const filter = context.createBiquadFilter();
                    filter.type = 'peaking';
                    filter.frequency.value = freq;
                    filter.Q.value = 1;
                    filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
                    return filter;
                });
                filtersRef.current = filters;

                // Connect filters in series
                for (let i = 0; i < filters.length - 1; i++) {
                    filters[i].connect(filters[i + 1]);
                }

                // Last filter connects to analyser
                filters[filters.length - 1].connect(analyser);
                analyser.connect(context.destination);

                // Initialize each audio element
                audioRefs.forEach(ref => {
                    if (ref.current) {
                        setupAudioSource(ref.current, context, filters[0]);
                    }
                });

            } catch (err) {
                console.warn('Failed to initialize audio visualizer:', err);
            }
        };

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

        if (isPlaying) {
            initAudio();
            if (contextRef.current?.state === 'suspended') {
                contextRef.current.resume();
            }
        }

        const handleFirstInteraction = () => {
            initAudio();
            if (contextRef.current?.state === 'suspended') {
                contextRef.current.resume();
            }
            document.removeEventListener('click', handleFirstInteraction);
        };

        document.addEventListener('click', handleFirstInteraction);

        // Re-check refs on update in case they were added later
        audioRefs.forEach(ref => {
            if (ref.current && contextRef.current && filtersRef.current[0]) {
                setupAudioSource(ref.current, contextRef.current, filtersRef.current[0]);
            }
        });

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
        };
    }, [audioRefs, isPlaying]);

    useEffect(() => {
        if (filtersRef.current.length > 0) {
            filtersRef.current.forEach((filter, i) => {
                filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
            });
        }
    }, [equalizerSettings]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyserRef.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            analyserRef.current!.getByteFrequencyData(dataArray);

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
                const barCount = 64;
                const barWidth = (width / barCount);
                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor((i / barCount) * bufferLength);
                    const barHeight = (dataArray[dataIndex] / 255) * height * 0.8;

                    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    gradient.addColorStop(0, `${accentColor}10`);
                    gradient.addColorStop(0.5, `${accentColor}80`);
                    gradient.addColorStop(1, accentColor);

                    ctx.shadowBlur = 15;
                    ctx.shadowColor = accentColor;
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.roundRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight, [12, 12, 0, 0]);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            } else if (visualizerStyle === 'circular') {
                const centerX = width / 2;
                const centerY = height / 2;
                const baseRadius = Math.min(width, height) / 6;

                ctx.shadowBlur = 20;
                ctx.shadowColor = accentColor;

                for (let i = 0; i < bufferLength; i += 2) {
                    const angle = (i / bufferLength) * Math.PI * 2;
                    const value = (dataArray[i] / 255) * baseRadius * 1.5;

                    const x1 = centerX + Math.cos(angle) * baseRadius;
                    const y1 = centerY + Math.sin(angle) * baseRadius;
                    const x2 = centerX + Math.cos(angle) * (baseRadius + value);
                    const y2 = centerY + Math.sin(angle) * (baseRadius + value);

                    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                    gradient.addColorStop(0, `${accentColor}40`);
                    gradient.addColorStop(1, accentColor);

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'waveform') {
                analyserRef.current!.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 3;
                ctx.strokeStyle = accentColor;
                ctx.lineJoin = 'round';
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

                ctx.shadowBlur = 15;
                ctx.shadowColor = accentColor;
                ctx.stroke();

                // Fill under waveform
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                const fillGradient = ctx.createLinearGradient(0, height/2, 0, height);
                fillGradient.addColorStop(0, `${accentColor}40`);
                fillGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = fillGradient;
                ctx.fill();

                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'particles') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = accentColor;
                for (let i = 0; i < bufferLength; i += 6) {
                    const value = dataArray[i];
                    const percent = value / 255;
                    const radius = percent * 20;
                    const x = (i / bufferLength) * width;
                    const y = height / 2 + (Math.sin(Date.now() / 1000 + i) * height / 4) - (percent * height / 2);

                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                    particleGradient.addColorStop(0, accentColor);
                    particleGradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = particleGradient;
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
            }
        };

        if (isPlaying) {
            if (contextRef.current?.state === 'suspended') {
                contextRef.current.resume();
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
