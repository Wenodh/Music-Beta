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
    const { equalizerSettings } = useAppSelector(state => state.musicPlayer);
    const [mode, setMode] = React.useState<'bars' | 'circular' | 'particles'>('bars');

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

            if (mode === 'bars') {
                const barWidth = (width / bufferLength) * 2;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * height * 0.9;
                    const hue = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#ef4444';
                    ctx.fillStyle = `${hue}80`;
                    ctx.beginPath();
                    ctx.roundRect(x, height - barHeight, barWidth - 1.5, barHeight, [6, 6, 0, 0]);
                    ctx.fill();
                    x += barWidth;
                }
            } else if (mode === 'circular') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) / 4;
                for (let i = 0; i < bufferLength; i++) {
                    const angle = (i / bufferLength) * Math.PI * 2;
                    const value = (dataArray[i] / 255) * radius * 0.5;
                    const x1 = centerX + Math.cos(angle) * radius;
                    const y1 = centerY + Math.sin(angle) * radius;
                    const x2 = centerX + Math.cos(angle) * (radius + value);
                    const y2 = centerY + Math.sin(angle) * (radius + value);
                    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
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
    }, [isPlaying]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                width={100}
                height={40}
                className="w-full h-full opacity-50 pointer-events-none"
            />
            <div className="absolute top-2 left-2 flex gap-1 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                {(['bars', 'circular'] as const).map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`text-[8px] font-bold uppercase px-2 py-1 rounded bg-black/50 text-white ${mode === m ? 'text-primary' : ''}`}
                    >
                        {m}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Visualizer;
