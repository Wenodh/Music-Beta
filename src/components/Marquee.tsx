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
                const scrollWidth = textRef.current.scrollWidth;
                if (scrollWidth > containerWidth) {
                    setShouldScroll(true);
                    setTextWidth(scrollWidth);
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
                animate={shouldScroll ? { x: [0, -(textWidth + 40)] } : { x: 0 }}
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
