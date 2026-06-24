import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { useAppSelector } from '../hooks/redux';

interface SongItemProps {
    id: string;
    title: string;
    image: any;
    type?: string;
    primaryArtists?: string;
}

const SongItem: React.FC<SongItemProps> = ({
    id,
    title,
    image,
    type,
    primaryArtists,
}) => {
    const navigate = useNavigate();
    const { currentSong, isPlaying } = useAppSelector((state) => state.musicPlayer);
    const isCurrent = currentSong?.id === id;

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const handleClick = () => {
        if (type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'artist') {
            navigate(`/artists/${id}`);
        } else {
            navigate(`/albums/${id}`);
        }
    };

    const imageUrl = Array.isArray(image) ? image[image.length - 1]?.url : (image || '');

    return (
        <motion.div
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center p-4 rounded-2xl glass-effect cursor-pointer group transition-shadow hover:shadow-2xl hover:shadow-primary/20 perspective-1000"
        >
            <div
                style={{ transform: "translateZ(50px)" }}
                className="relative w-full aspect-square mb-3 overflow-hidden rounded-xl shadow-xl holographic"
            >
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${isCurrent ? 'brightness-50' : ''}`}
                />
                {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="flex gap-1.5 items-end h-10">
                            {[1, 2, 3, 4].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={isPlaying ? {
                                        height: ["20%", "100%", "20%"]
                                    } : {
                                        height: `${(i % 3 + 1) * 25}%`
                                    }}
                                    transition={{
                                        duration: 0.6,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                        ease: "easeInOut"
                                    }}
                                    className="w-1.5 bg-primary rounded-full shadow-[0_0_10px_var(--accent-color)]"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Holographic Shine Overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none transition-opacity" />
            </div>

            <div style={{ transform: "translateZ(30px)" }} className="w-full text-center">
                <p className="text-sm font-bold truncate w-full group-hover:text-primary transition-colors">{decodeHtmlEntities(title)}</p>
                {primaryArtists && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full mt-1">
                        {decodeHtmlEntities(primaryArtists)}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default SongItem;
