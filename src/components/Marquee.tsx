import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MarqueeProps {
    text: string;
    speed?: number;
    className?: string;
}

const Marquee = ({ text, speed = 30, className = "" }: MarqueeProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [textWidth, setTextWidth] = useState(0);

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                // If already scrolling, scrollWidth is roughly double.
                // We want the width of just one iteration.
                const contentWidth = shouldScroll
                    ? textRef.current.scrollWidth / 2
                    : textRef.current.scrollWidth;

                if (contentWidth > containerWidth) {
                    setShouldScroll(true);
                    setTextWidth(contentWidth);
                } else {
                    setShouldScroll(false);
                }
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);
        // Small delay to ensure layout is done
        const timeout = setTimeout(checkScroll, 500);

        return () => {
            window.removeEventListener('resize', checkScroll);
            clearTimeout(timeout);
        };
    }, [text]);

    return (
        <div
            className={`overflow-hidden whitespace-nowrap relative ${className}`}
            ref={containerRef}
            style={{
                maskImage: shouldScroll ? 'linear-gradient(to right, black 85%, transparent)' : 'none',
                WebkitMaskImage: shouldScroll ? 'linear-gradient(to right, black 85%, transparent)' : 'none'
            }}
        >
            <motion.div
                ref={textRef}
                animate={shouldScroll ? { x: [0, -textWidth] } : { x: 0 }}
                transition={{
                    duration: (textWidth / speed) || 5,
                    repeat: Infinity,
                    ease: "linear",
                    repeatDelay: 2
                }}
                className="inline-block"
            >
                <span className="pr-10">{text}</span>
                {shouldScroll && <span className="pr-10">{text}</span>}
            </motion.div>
        </div>
    );
};

export default Marquee;
