import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface AlbumItemProps {
    id: string;
    image: string;
    name: string;
    artists?: string;
    type?: string;
    data?: any;
}

const AlbumItem: React.FC<AlbumItemProps> = (props) => {
    const { id, image, name, artists, type, data } = props;
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

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
        if ((type === 'song' || data?.type === 'song') && data) {
            dispatch(playMusic(data));
            return;
        }

        if (type === 'playlist' || data?.type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'artist') {
            navigate(`/artists/${id}`);
        } else {
            navigate(`/albums/${id}`);
        }
    };

    return (
        <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            className="flex flex-col items-start gap-2 p-3 rounded-2xl glass-effect cursor-pointer transition-shadow hover:shadow-2xl hover:shadow-primary/10 w-[140px] sm:w-40 shrink-0 group perspective-1000"
        >
            <div
                style={{ transform: "translateZ(40px)" }}
                className={`relative w-full aspect-square overflow-hidden shadow-inner holographic ${type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}
            >
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_0_15px_var(--accent-color)] transform scale-0 group-hover:scale-100 transition-transform duration-300">
                        ▶
                    </div>
                </div>
            </div>
            <div style={{ transform: "translateZ(20px)" }} className="w-full px-1 mt-1">
                <p className="font-bold text-sm truncate group-hover:text-primary transition-colors leading-tight">{decodeHtmlEntities(name)}</p>
                {artists && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-1 opacity-80">{decodeHtmlEntities(artists)}</p>
                )}
            </div>
        </motion.div>
    );
};

export default AlbumItem;
