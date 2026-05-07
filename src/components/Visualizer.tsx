import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
    audioRef: React.RefObject<HTMLAudioElement>;
    isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioRef, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    useEffect(() => {
        if (!audioRef.current) return;

        const initAudio = () => {
            if (analyserRef.current) return;
            try {
                const audioEl = audioRef.current as any;
                let context: AudioContext;
                let source: MediaElementAudioSourceNode;

                if (audioEl._visualizerContext) {
                    context = audioEl._visualizerContext;
                    source = audioEl._visualizerSource;
                } else {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    context = new AudioContextClass();
                    source = context.createMediaElementSource(audioRef.current!);
                    audioEl._visualizerContext = context;
                    audioEl._visualizerSource = source;
                }

                const analyser = context.createAnalyser();
                source.connect(analyser);
                analyser.connect(context.destination);

                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;
                contextRef.current = context;
                analyserRef.current = analyser;
                sourceRef.current = source;
            } catch (err) {
                console.warn('Failed to initialize audio visualizer:', err);
            }
        };

        // Initialize immediately if it's already playing or when it starts playing
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

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
        };
    }, [audioRef, isPlaying]);

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

            // High DPI adjustment
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== canvas.clientWidth * dpr || canvas.height !== canvas.clientHeight * dpr) {
                canvas.width = canvas.clientWidth * dpr;
                canvas.height = canvas.clientHeight * dpr;
                ctx.scale(dpr, dpr);
            }

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height * 0.9;

                // Random vibrant colors based on frequency index
                const hue = (i * 137.5) % 360;
                ctx.fillStyle = `hsla(${hue}, 85%, 60%, 0.7)`;

                // Rounded bars
                ctx.beginPath();
                ctx.roundRect(x, height - barHeight, barWidth - 1.5, barHeight, [6, 6, 0, 0]);
                ctx.fill();

                x += barWidth;
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
        <canvas
            ref={canvasRef}
            width={100}
            height={40}
            className="w-full h-full opacity-50 pointer-events-none"
        />
    );
};

export default Visualizer;
