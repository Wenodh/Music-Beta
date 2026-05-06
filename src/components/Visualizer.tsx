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
        if (!audioRef.current || analyserRef.current) return;

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

                analyser.fftSize = 256;
                contextRef.current = context;
                analyserRef.current = analyser;
                sourceRef.current = source;
            } catch (err) {
                console.warn('Failed to initialize audio visualizer:', err);
            }
        };

        const handleFirstInteraction = () => {
            initAudio();
            document.removeEventListener('click', handleFirstInteraction);
        };

        document.addEventListener('click', handleFirstInteraction);

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
        };
    }, [audioRef]);

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

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                const red = (barHeight + 100) * (i / bufferLength);
                const green = 50 * (i / bufferLength);
                const blue = 150;

                ctx.fillStyle = `rgb(${red},${green},${blue})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
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
            className="w-full h-full opacity-30 pointer-events-none"
        />
    );
};

export default Visualizer;
