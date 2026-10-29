import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

const AlbumItem: React.FC<AlbumItemProps> = React.memo((props) => {
    const { id, image, name, artists, type, data } = props;
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

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
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={handleClick}
            className="flex flex-col items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl glass-card hover:border-primary/40 cursor-pointer transition-all w-[128px] sm:w-40 shrink-0 group shadow-lg hover:shadow-2xl"
        >
            <div className={`relative w-[110px] h-[110px] sm:w-36 sm:h-36 overflow-hidden shadow-xl ${type === 'artist' ? 'rounded-full border-2 border-primary/20' : 'rounded-2xl'}`}>
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        ▶
                    </div>
                </div>
            </div>
            <div className="w-full px-1">
                <p className="font-extrabold text-sm truncate group-hover:text-primary transition-colors leading-tight text-slate-100">{decodeHtmlEntities(name)}</p>
                {artists && (
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{decodeHtmlEntities(artists)}</p>
                )}
            </div>
        </motion.div>
    );
});

AlbumItem.displayName = 'AlbumItem';

export default AlbumItem;
