import { BiRepeat } from 'react-icons/bi';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold } from 'react-icons/pi';
import { FaPlay, FaPause } from 'react-icons/fa';
import { HiSpeakerWave } from 'react-icons/hi2';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai'; // For spinner
import { IoEllipsisVertical } from 'react-icons/io5';
import { RiShareForwardLine } from 'react-icons/ri';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    playMusic,
    decrementSleepTimer,
} from '../features/musicplayer/musicPlayerSlice';
import { useNavigate } from 'react-router-dom';
import SleepTimer from './SleepTimer';
import VolumeController from './VolumeController';
import { motion, AnimatePresence } from 'framer-motion';
import { setPreferredQuality } from '../features/musicplayer/musicPlayerSlice';
import { HiQueueList } from 'react-icons/hi2';
import Queue from './Queue';
import { MdOutlineLyrics } from 'react-icons/md';
import Lyrics from './Lyrics';
import { IoHeartOutline, IoHeart, IoAddCircleOutline } from 'react-icons/io5';
import { useColor } from 'color-thief-react';
import { toggleFavorite, addToPlaylist } from '../features/library/librarySlice';
import { suggestions } from '../constants';
import { setRecommendations, setQueueOpen } from '../features/musicplayer/musicPlayerSlice';
import Visualizer from './Visualizer';

const Player = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isVolumeVisible, setIsVolumeVisible] = useState(false);
    const [seekAnimation, setSeekAnimation] = useState<'forward' | 'backward' | null>(null);
    const [isLyricsOpen, setIsLyricsOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const { currentSong, isPlaying, songs, sleepTimer, preferredQuality, isQueueOpen } = useAppSelector(
        (state) => state.musicPlayer
    );
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);

    const imageUrl = typeof currentSong?.image === 'string' ? currentSong?.image : currentSong?.image?.[currentSong?.image?.length - 1]?.url;
    const { data: dominantColor } = useColor(imageUrl || '', 'hex', { crossOrigin: 'anonymous' });

    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    };

    const isFavorite = favorites.some(s => s.id === currentSong?.id);
    const audioRef = useRef(new Audio(''));

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.crossOrigin = 'anonymous';
        }
    }, []);

    const nextSong = useCallback(() => {
        if (currentSong && songs.length > 0) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const nextIndex = (index + 1) % songs.length;
            const next = songs[nextIndex];

            dispatch(
                playMusic({
                    music: next.downloadUrl,
                    name: next.name,
                    duration: next.duration,
                    image: next.image,
                    id: next.id,
                    primaryArtists: next.primaryArtists,
                    albumId: next?.album && typeof next.album !== 'string' ? next.album.id : undefined,
                })
            );
        }
    }, [currentSong, songs, dispatch]);

    const prevSong = useCallback(() => {
        if (currentSong && songs.length > 0) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const prevIndex = (index - 1 + songs.length) % songs.length;
            const prev = songs[prevIndex];
            dispatch(
                playMusic({
                    music: prev.downloadUrl,
                    name: prev.name,
                    duration: prev.duration,
                    image: prev.image,
                    id: prev.id,
                    primaryArtists: prev.primaryArtists,
                    albumId: prev?.album && typeof prev.album !== 'string' ? prev.album.id : undefined,
                })
            );
        }
    }, [currentSong, songs, dispatch]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    handlePlayPause();
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) nextSong();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) prevSong();
                    break;
                case 'KeyM':
                    // Volume toggle could be here
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, currentSong, nextSong, prevSong]);

    useEffect(() => {
        if (currentSong) {
            // Fetch recommendations
            fetch(suggestions(currentSong.id))
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'SUCCESS' && data.data) {
                        dispatch(setRecommendations(data.data));
                    }
                })
                .catch(err => console.error('Error fetching recommendations:', err));
        }
    }, [currentSong, dispatch]);

    useEffect(() => {
        let interval: any;
        if (isPlaying && sleepTimer !== null && sleepTimer > 0) {
            interval = setInterval(() => {
                dispatch(decrementSleepTimer());
            }, 60000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, sleepTimer, dispatch]);

    useEffect(() => {
        if (dominantColor) {
            document.documentElement.style.setProperty('--primary-dynamic', dominantColor);
            document.documentElement.style.setProperty('--primary-dynamic-rgb', hexToRgb(dominantColor));
        }
    }, [dominantColor]);

    useEffect(() => {
        if (currentSong) {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                  title: currentSong?.name,
                  artist: currentSong?.primaryArtists,
                  album: typeof currentSong?.album === 'string' ? currentSong?.album : currentSong?.album?.name,
                  artwork: [
                    { src: typeof currentSong.image === 'string' ? currentSong.image : currentSong.image[currentSong.image.length - 1].url , sizes: '512x512', type: 'image/png' }
                  ]
                });
                navigator.mediaSession.setActionHandler('previoustrack', prevSong);
                navigator.mediaSession.setActionHandler('nexttrack', nextSong);
            }
            if (audioRef.current) {
                const musicData = currentSong?.music || currentSong?.downloadUrl;
                const songUrl = Array.isArray(musicData) ? musicData[musicData.length - 1]?.url : musicData;
                if (songUrl && audioRef.current.src !== songUrl) {
                    audioRef.current.src = songUrl;
                }
            }

            if (isPlaying) {
                audioRef.current?.play().catch(e => console.log("Playback failed", e));
            } else {
                audioRef.current?.pause();
            }

            const handleTimeUpdate = () => {
                const duration = Number(currentSong.duration);
                const currentTime = audioRef.current.currentTime;
                const progress = (currentTime / duration) * 100;
                const progressElement = document.getElementById('progress') as HTMLInputElement;
                if (progressElement) {
                    progressElement.value = progress.toString();
                    const value = (progress - 0) / (100 - 0) * 100;
                    progressElement.style.background = `linear-gradient(to right, #ef4444 0%, #ef4444 ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
                }
            };

            const handleSongEnd = () => nextSong();
            const currentAudio = audioRef.current;
            currentAudio?.addEventListener('timeupdate', handleTimeUpdate);
            currentAudio?.addEventListener('ended', handleSongEnd);

            return () => {
                currentAudio?.removeEventListener('timeupdate', handleTimeUpdate);
                currentAudio?.removeEventListener('ended', handleSongEnd);
            };
        }
    }, [currentSong, isPlaying, nextSong, prevSong]);

    const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newPercentage = parseFloat(event.target.value);
        const newTime = (newPercentage / 100) * Number(currentSong?.duration || 0);
        if (newTime >= 0) {
            audioRef.current.currentTime = newTime;
        }
    };

    const handleDoubleTap = (side: 'left' | 'right') => {
        const seekAmount = side === 'left' ? -10 : 10;
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seekAmount));
            setSeekAnimation(side === 'left' ? 'backward' : 'forward');
            setTimeout(() => setSeekAnimation(null), 500);
        }
    };

    const handleDownloadSong = async (url: string) => {
        if (!url) return;
        setIsDownloading(true);
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${currentSong?.name}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.log('Error downloading the song', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play().catch(e => console.log("Playback failed", e));
        }
        dispatch(playMusic(currentSong));
    };

    const handleShare = async () => {
        const songUrl = window.location.origin + `/albums/${currentSong?.albumId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentSong?.name,
                    text: `Check out ${currentSong?.name} by ${currentSong?.primaryArtists} on VibeOn!`,
                    url: songUrl,
                });
            } catch (error) {
                console.log('Error sharing', error);
            }
        } else {
            navigator.clipboard.writeText(songUrl);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <AnimatePresence>
            {currentSong && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    style={{
                        backgroundColor: dominantColor ? `${dominantColor}15` : undefined,
                        borderTopColor: dominantColor ? `${dominantColor}40` : undefined,
                    }}
                    className="dark:bg-gray-900/80 dark:text-white fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-lg border-t border-white/20 dark:border-gray-800/20 flex flex-col z-50"
                >
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <Visualizer audioRef={audioRef} isPlaying={isPlaying} />
                    </div>
                    <input
                        type="range"
                        id="progress"
                        min={0}
                        max={100}
                        step="0.1"
                        defaultValue={0}
                        onChange={handleProgressChange}
                        className="w-full h-[3px] cursor-pointer appearance-none bg-gray-200 dark:bg-gray-700"
                    />
                    <div className="flex justify-between items-center py-3 px-4 lg:px-8">
                        {/* 1st div */}
                        <div className="flex justify-start items-center gap-4 lg:w-[30vw]">
                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.x > 100) prevSong();
                                    else if (info.offset.x < -100) nextSong();
                                }}
                                className="relative group cursor-grab active:cursor-grabbing"
                            >
                                <motion.img
                                    animate={{ rotate: isPlaying ? 360 : 0 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    src={imageUrl}
                                    alt=""
                                    width={55}
                                    height={55}
                                    className="rounded-full shadow-lg"
                                    loading="lazy"
                                    onDoubleClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        handleDoubleTap(x < rect.width / 2 ? 'left' : 'right');
                                    }}
                                    onClick={() =>
                                        currentSong?.albumId &&
                                        navigate(`/albums/${currentSong.albumId}`)
                                    }
                                />
                                <AnimatePresence>
                                    {seekAnimation && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${seekAnimation === 'backward' ? 'pr-8' : 'pl-8'}`}
                                        >
                                            <div className="bg-black/40 text-white px-2 py-1 rounded-full text-[10px] font-bold">
                                                {seekAnimation === 'backward' ? '-10s' : '+10s'}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-[8px] text-white font-bold uppercase">Swipe</span>
                                </div>
                            </motion.div>
                            <div className="hidden md:block overflow-hidden max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]">
                                <p className="font-semibold text-sm sm:text-base truncate">{currentSong?.name}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {currentSong?.primaryArtists}
                                </p>
                            </div>
                            <div className="flex gap-2 items-center ml-2 lg:flex">
                                <div className="hidden lg:flex gap-2">
                                    <motion.div whileTap={{ scale: 0.8 }}>
                                        {isFavorite ? (
                                            <IoHeart
                                                onClick={() => dispatch(toggleFavorite(currentSong))}
                                                className="text-red-500 cursor-pointer text-xl"
                                            />
                                        ) : (
                                            <IoHeartOutline
                                                onClick={() => dispatch(toggleFavorite(currentSong))}
                                                className="text-gray-500 hover:text-red-500 cursor-pointer text-xl"
                                            />
                                        )}
                                    </motion.div>
                                    <div className="relative">
                                        <IoAddCircleOutline
                                            onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
                                            className="text-gray-500 hover:text-red-500 cursor-pointer text-xl"
                                        />
                                        <AnimatePresence>
                                            {isPlaylistMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden py-1"
                                                >
                                                    <p className="px-3 py-2 text-[10px] uppercase font-bold text-gray-400">Add to Playlist</p>
                                                    {playlists.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                dispatch(addToPlaylist({ playlistId: p.id, song: currentSong }));
                                                                setIsPlaylistMenuOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors truncate"
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))}
                                                    {playlists.length === 0 && (
                                                        <p className="px-3 py-2 text-xs text-gray-500 italic">No playlists found</p>
                                                    )}
                                                    <div className="border-t border-gray-100 dark:border-gray-700 mt-1">
                                                        <button
                                                            onClick={() => {
                                                                navigate('/library');
                                                                setIsPlaylistMenuOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-medium"
                                                        >
                                                            + New Playlist
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2nd div */}
                        <div className="flex text-2xl lg:text-3xl gap-6 lg:gap-8 lg:w-[40vw] justify-center items-center">
                            <BiRepeat className="text-gray-400 cursor-pointer hover:text-red-400 transition-colors hidden sm:block" />
                            <motion.div whileTap={{ scale: 0.9 }}>
                                <IoMdSkipBackward
                                    onClick={prevSong}
                                    className="text-gray-700 dark:text-gray-200 hover:text-red-500 cursor-pointer transition-colors"
                                />
                            </motion.div>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handlePlayPause}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
                            >
                                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
                            </motion.button>

                            <motion.div whileTap={{ scale: 0.9 }}>
                                <IoMdSkipForward
                                    onClick={nextSong}
                                    className="text-gray-700 dark:text-gray-200 hover:text-red-500 cursor-pointer transition-colors"
                                />
                            </motion.div>
                            <PiShuffleBold className="text-gray-400 cursor-pointer hover:text-red-400 transition-colors hidden sm:block" />
                        </div>

                        {/* 3rd div */}
                        <div className="flex lg:w-[30vw] justify-end items-center gap-3 lg:gap-5">
                            <motion.div whileTap={{ scale: 0.9 }} className="hidden lg:block">
                                <MdOutlineLyrics
                                    onClick={() => setIsLyricsOpen(!isLyricsOpen)}
                                    className={`text-2xl cursor-pointer hover:text-red-500 transition-colors ${isLyricsOpen ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
                                />
                            </motion.div>
                            <motion.div whileTap={{ scale: 0.9 }}>
                                <HiQueueList
                                    onClick={() => dispatch(setQueueOpen(!isQueueOpen))}
                                    className={`text-2xl cursor-pointer hover:text-red-500 transition-colors ${isQueueOpen ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
                                />
                            </motion.div>
                            <div className="hidden lg:block">
                                <SleepTimer />
                            </div>

                            <div className="relative">
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer transition-colors"
                                >
                                    <IoEllipsisVertical className="text-xl text-gray-700 dark:text-gray-200" />
                                </motion.div>

                                <AnimatePresence>
                                    {isMoreMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute bottom-full right-0 mb-4 w-56 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden py-2 z-[60]"
                                        >
                                            <div className="lg:hidden px-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-3 p-2">
                                                    <img src={imageUrl} alt="" className="w-10 h-10 rounded-lg shadow-sm" />
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-bold truncate">{currentSong?.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{currentSong?.primaryArtists}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    dispatch(toggleFavorite(currentSong));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {isFavorite ? <IoHeart className="text-red-500" size={20} /> : <IoHeartOutline size={20} />}
                                                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsPlaylistMenuOpen(true);
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <IoAddCircleOutline size={20} /> Add to Playlist
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsLyricsOpen(true);
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
                                            >
                                                <MdOutlineLyrics size={20} /> Lyrics
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleShare();
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <RiShareForwardLine size={20} /> Share Song
                                            </button>

                                            <div className="lg:hidden border-t border-gray-100 dark:border-gray-700 mt-1">
                                                <div className="px-4 py-2">
                                                    <SleepTimer />
                                                </div>
                                            </div>

                                            {isDownloading ? (
                                                <div className="px-4 py-3 flex items-center gap-3 text-sm text-gray-400">
                                                    <AiOutlineLoading3Quarters className="animate-spin text-red-500" />
                                                    Downloading...
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        const songUrl = Array.isArray(currentSong?.music) ? currentSong?.music[currentSong?.music?.length - 1]?.url : currentSong?.music;
                                                        handleDownloadSong(songUrl || '');
                                                        setIsMoreMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <LuHardDriveDownload size={20} /> Download Song
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div
                                className="relative"
                                onMouseEnter={() => setIsVolumeVisible(true)}
                                onMouseLeave={() => setIsVolumeVisible(false)}
                            >
                                <HiSpeakerWave className="text-gray-700 dark:text-gray-200 hover:text-red-500 text-2xl lg:text-3xl cursor-pointer hidden lg:block transition-colors" />
                                <VolumeController isVolumeVisible={isVolumeVisible} audioRef={audioRef} />
                            </div>
                        </div>
                    </div>
                    <Lyrics
                        isOpen={isLyricsOpen}
                        onClose={() => setIsLyricsOpen(false)}
                        songId={currentSong?.id || ''}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Player;
