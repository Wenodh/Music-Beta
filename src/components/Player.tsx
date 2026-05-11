import { BiRepeat } from 'react-icons/bi';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold } from 'react-icons/pi';
import { FaPlay, FaPause } from 'react-icons/fa';
import { HiSpeakerWave } from 'react-icons/hi2';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { IoEllipsisVertical } from 'react-icons/io5';
import { RiShareForwardLine } from 'react-icons/ri';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    playMusic,
    decrementSleepTimer,
    setCurrentTime,
} from '../features/musicplayer/musicPlayerSlice';
import { useNavigate } from 'react-router-dom';
import SleepTimer from './SleepTimer';
import VolumeController from './VolumeController';
import { motion, AnimatePresence } from 'framer-motion';
import { HiQueueList } from 'react-icons/hi2';
import { MdOutlineGraphicEq, MdOutlineCloseFullscreen } from 'react-icons/md';
import { MdOutlineLyrics } from 'react-icons/md';
import { IoHeartOutline, IoHeart, IoAddCircleOutline } from 'react-icons/io5';
import { toggleFavorite } from '../features/library/librarySlice';
import { suggestions } from '../constants';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { setRecommendations, setQueueOpen } from '../features/musicplayer/musicPlayerSlice';
import Visualizer from './Visualizer';
import MobileNowPlaying from './MobileNowPlaying';
import { openPlaylistModal, setEqualizerOpen, setLyricsOpen } from '../features/ui/uiSlice';
import { Song } from '../types/music';

const Player = ({ onShowMiniPlayer }: { onShowMiniPlayer?: () => void }) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isVolumeVisible, setIsVolumeVisible] = useState(false);
    const [seekAnimation, setSeekAnimation] = useState<'forward' | 'backward' | null>(null);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [userVolume, setUserVolume] = useState(0.7);
    const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);

    const {
        currentSong, isPlaying, songs, sleepTimer, preferredQuality, isQueueOpen,
        isGaplessEnabled, crossfadeDuration
    } = useAppSelector((state) => state.musicPlayer);

    const { isLyricsOpen } = useAppSelector((state) => state.ui);
    const { favorites } = useAppSelector((state) => state.library);

    const imageUrl = typeof currentSong?.image === 'string' ? currentSong?.image : currentSong?.image?.[currentSong?.image?.length - 1]?.url;
    const isFavorite = favorites.some(s => s.id === currentSong?.id);

    // Dual buffer system
    const audioRefA = useRef<HTMLAudioElement>(new Audio(''));
    const audioRefB = useRef<HTMLAudioElement>(new Audio(''));
    const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');
    const [isCrossfading, setIsCrossfading] = useState(false);

    const getActiveAudio = () => activeBuffer === 'A' ? audioRefA.current : audioRefB.current;
    const getInactiveAudio = () => activeBuffer === 'A' ? audioRefB.current : audioRefA.current;

    useEffect(() => {
        [audioRefA.current, audioRefB.current].forEach(audio => {
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
        });
    }, []);

    const getSongUrl = useCallback((song: Song | null) => {
        if (!song) return '';
        const musicData = song.music || song.downloadUrl;
        if (Array.isArray(musicData)) {
            return musicData.find((d: any) => d.quality === preferredQuality)?.url || musicData[musicData.length - 1]?.url;
        }
        return musicData || '';
    }, [preferredQuality]);

    const playNextInQueue = useCallback((isManual = true) => {
        if (currentSong && songs.length > 0) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const nextIndex = (index + 1) % songs.length;
            const next = songs[nextIndex];

            if (!isManual && isGaplessEnabled && !isCrossfading) {
                // Crossfade logic handled in timeupdate
                return;
            }

            dispatch(playMusic({
                ...next,
                albumId: next?.album && typeof next.album !== 'string' ? next.album.id : undefined,
            }));
        }
    }, [currentSong, songs, dispatch, isGaplessEnabled, isCrossfading]);

    const prevSong = useCallback(() => {
        if (currentSong && songs.length > 0) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const prevIndex = (index - 1 + songs.length) % songs.length;
            const prev = songs[prevIndex];
            dispatch(playMusic({
                ...prev,
                albumId: prev?.album && typeof prev.album !== 'string' ? prev.album.id : undefined,
            }));
        }
    }, [currentSong, songs, dispatch]);

    // Handle Metadata & Recommendations
    useEffect(() => {
        if (currentSong) {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                  title: decodeHtmlEntities(currentSong?.name),
                  artist: decodeHtmlEntities(currentSong?.primaryArtists),
                  album: decodeHtmlEntities(typeof currentSong?.album === 'string' ? currentSong?.album : currentSong?.album?.name || ''),
                  artwork: [
                    { src: imageUrl || '', sizes: '96x96', type: 'image/png' },
                    { src: imageUrl || '', sizes: '128x128', type: 'image/png' },
                    { src: imageUrl || '', sizes: '192x192', type: 'image/png' },
                    { src: imageUrl || '', sizes: '256x256', type: 'image/png' },
                    { src: imageUrl || '', sizes: '384x384', type: 'image/png' },
                    { src: imageUrl || '', sizes: '512x512', type: 'image/png' },
                  ]
                });
                navigator.mediaSession.setActionHandler('previoustrack', prevSong);
                navigator.mediaSession.setActionHandler('nexttrack', () => playNextInQueue(true));
                navigator.mediaSession.setActionHandler('play', () => dispatch(playMusic(currentSong)));
                navigator.mediaSession.setActionHandler('pause', () => dispatch(pauseMusic()));
                navigator.mediaSession.setActionHandler('seekbackward', () => handleDoubleTap('left'));
                navigator.mediaSession.setActionHandler('seekforward', () => handleDoubleTap('right'));
            }

            fetch(suggestions(currentSong.id))
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'SUCCESS' && data.data) {
                        dispatch(setRecommendations(data.data));
                    }
                }).catch(err => console.error('Error fetching recommendations:', err));
        }
    }, [currentSong, dispatch, imageUrl, prevSong, playNextInQueue]);

    // Handle Playback State
    useEffect(() => {
        const activeAudio = getActiveAudio();
        const songUrl = getSongUrl(currentSong);

        if (songUrl && activeAudio.src !== songUrl) {
            activeAudio.src = songUrl;
            setIsCrossfading(false);
        }

        if (isPlaying) {
            activeAudio.play().catch(e => console.warn("Playback failed", e));
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        } else {
            activeAudio.pause();
            getInactiveAudio().pause();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    }, [currentSong, isPlaying, activeBuffer, getSongUrl]);

    // Preload next song
    useEffect(() => {
        if (isGaplessEnabled && currentSong && songs.length > 0) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const nextIndex = (index + 1) % songs.length;
            const nextSong = songs[nextIndex];
            const nextUrl = getSongUrl(nextSong);

            const inactiveAudio = getInactiveAudio();
            if (nextUrl && inactiveAudio.src !== nextUrl) {
                inactiveAudio.src = nextUrl;
                inactiveAudio.load();
            }
        }
    }, [currentSong, songs, isGaplessEnabled, activeBuffer, getSongUrl]);

    // Crossfade Logic
    useEffect(() => {
        const activeAudio = getActiveAudio();
        const inactiveAudio = getInactiveAudio();

        const handleTimeUpdate = () => {
            if (!currentSong) return;
            const duration = activeAudio.duration;
            const currentTime = activeAudio.currentTime;

            dispatch(setCurrentTime(currentTime));

            // Update Progress Bar
            const progress = (currentTime / (duration || 1)) * 100;
            const progressElement = document.getElementById('progress') as HTMLInputElement;
            if (progressElement) {
                progressElement.value = progress.toString();
                const value = progress;
                const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ef4444';
                progressElement.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
            }

            // Crossfade Trigger
            if (isGaplessEnabled && !isCrossfading && duration > 0 && currentTime > (duration - crossfadeDuration)) {
                setIsCrossfading(true);
                startCrossfade();
            }
        };

        const startCrossfade = () => {
            const nextIndex = (songs.findIndex(s => s.id === currentSong?.id) + 1) % songs.length;
            const next = songs[nextIndex];

            inactiveAudio.volume = 0;
            inactiveAudio.play().then(() => {
                // Ramp volumes
                const steps = 20;
                const interval = (crossfadeDuration * 1000) / steps;
                let step = 0;

                const fade = setInterval(() => {
                    step++;
                    const progress = step / steps;

                    // Simple linear fade for now
                    activeAudio.volume = userVolume * (1 - progress);
                    inactiveAudio.volume = userVolume * progress;

                    if (step >= steps) {
                        clearInterval(fade);
                        // Complete transition
                        activeAudio.pause();
                        activeAudio.currentTime = 0;
                        setActiveBuffer(activeBuffer === 'A' ? 'B' : 'A');
                        setIsCrossfading(false);

                        // Update Redux state to the new song
                        dispatch(playMusic({
                            ...next,
                            albumId: next?.album && typeof next.album !== 'string' ? next.album.id : undefined,
                        }));
                    }
                }, interval);
            }).catch(err => {
                console.error("Crossfade play failed", err);
                setIsCrossfading(false);
            });
        };

        const handleSongEnd = () => {
            if (!isCrossfading) {
                playNextInQueue(true);
            }
        };

        activeAudio.addEventListener('timeupdate', handleTimeUpdate);
        activeAudio.addEventListener('ended', handleSongEnd);

        return () => {
            activeAudio.removeEventListener('timeupdate', handleTimeUpdate);
            activeAudio.removeEventListener('ended', handleSongEnd);
        };
    }, [activeBuffer, currentSong, isGaplessEnabled, isCrossfading, crossfadeDuration, songs, userVolume, dispatch, playNextInQueue]);

    // Update individual audio volumes based on user global volume
    useEffect(() => {
        if (!isCrossfading) {
            audioRefA.current.volume = userVolume;
            audioRefB.current.volume = userVolume;
        }
    }, [userVolume, isCrossfading]);

    const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const activeAudio = getActiveAudio();
        const newPercentage = parseFloat(event.target.value);
        const newTime = (newPercentage / 100) * (activeAudio.duration || 0);
        if (newTime >= 0) {
            activeAudio.currentTime = newTime;
        }
    };

    const handlePlayPause = () => {
        dispatch(playMusic(currentSong));
    };

    const handleDoubleTap = (side: 'left' | 'right') => {
        const activeAudio = getActiveAudio();
        const seekAmount = side === 'left' ? -10 : 10;
        activeAudio.currentTime = Math.max(0, Math.min(activeAudio.duration, activeAudio.currentTime + seekAmount));
        setSeekAnimation(side === 'left' ? 'backward' : 'forward');
        setTimeout(() => setSeekAnimation(null), 500);
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
            console.warn('Error downloading the song', error);
        } finally {
            setIsDownloading(false);
        }
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
            } catch (error) { console.log('Error sharing', error); }
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
                    className="dark:bg-gray-900/80 dark:text-white fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-lg border-t border-white/20 dark:border-gray-800/20 flex flex-col z-50"
                >
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <Visualizer audioRefs={[audioRefA, audioRefB]} isPlaying={isPlaying} />
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
                    <div className="flex justify-between items-center py-3 px-4 lg:px-8" onClick={() => window.innerWidth < 768 && setIsMobilePlayerOpen(true)}>
                        {/* 1st div */}
                        <div className="flex justify-start items-center gap-4 lg:w-[30vw]">
                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.x > 100) prevSong();
                                    else if (info.offset.x < -100) playNextInQueue(true);
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
                                <p className="font-semibold text-sm sm:text-base truncate">{decodeHtmlEntities(currentSong?.name)}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {decodeHtmlEntities(currentSong?.primaryArtists)}
                                </p>
                            </div>
                            <div className="flex gap-2 items-center ml-2 lg:flex">
                                <div className="hidden lg:flex gap-2">
                                    <motion.div whileTap={{ scale: 0.8 }}>
                                        {isFavorite ? (
                                            <IoHeart
                                                onClick={() => dispatch(toggleFavorite(currentSong))}
                                                className="text-primary cursor-pointer text-xl"
                                            />
                                        ) : (
                                            <IoHeartOutline
                                                onClick={() => dispatch(toggleFavorite(currentSong))}
                                                className="text-gray-500 hover:text-primary cursor-pointer text-xl"
                                            />
                                        )}
                                    </motion.div>
                                    <div className="relative">
                                        <IoAddCircleOutline
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dispatch(openPlaylistModal(currentSong!));
                                            }}
                                            className="text-gray-500 hover:text-primary cursor-pointer text-xl"
                                            title="Add to Playlist"
                                        />
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
                                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer transition-colors"
                                />
                            </motion.div>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handlePlayPause}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-red-600 transition-colors"
                            >
                                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
                            </motion.button>

                            <motion.div whileTap={{ scale: 0.9 }}>
                                <IoMdSkipForward
                                    onClick={() => playNextInQueue(true)}
                                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer transition-colors"
                                />
                            </motion.div>
                            <PiShuffleBold className="text-gray-400 cursor-pointer hover:text-red-400 transition-colors hidden sm:block" />
                        </div>

                        {/* 3rd div */}
                        <div className="flex lg:w-[30vw] justify-end items-center gap-3 lg:gap-5">
                            <motion.div whileTap={{ scale: 0.9 }} className="hidden lg:block">
                                <MdOutlineLyrics
                                    onClick={() => dispatch(setLyricsOpen(!isLyricsOpen))}
                                    className={`text-2xl cursor-pointer hover:text-primary transition-colors ${isLyricsOpen ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                                />
                            </motion.div>
                            <motion.div whileTap={{ scale: 0.9 }}>
                                <HiQueueList
                                    onClick={() => dispatch(setQueueOpen(!isQueueOpen))}
                                    className={`text-2xl cursor-pointer hover:text-primary transition-colors ${isQueueOpen ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}
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
                                                        <p className="text-sm font-bold truncate">{decodeHtmlEntities(currentSong?.name)}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{decodeHtmlEntities(currentSong?.primaryArtists)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    dispatch(toggleFavorite(currentSong!));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {isFavorite ? <IoHeart className="text-primary" size={20} /> : <IoHeartOutline size={20} />}
                                                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    onShowMiniPlayer?.();
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hidden lg:flex"
                                            >
                                                <MdOutlineCloseFullscreen size={20} /> Mini Player
                                            </button>

                                            <button
                                                onClick={() => {
                                                    dispatch(openPlaylistModal(currentSong!));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                title="Add to Playlist"
                                            >
                                                <IoAddCircleOutline size={20} /> Add to Playlist
                                            </button>

                                            <button
                                                onClick={() => {
                                                    dispatch(setEqualizerOpen(true));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <MdOutlineGraphicEq size={20} /> Equalizer
                                            </button>

                                            <button
                                                onClick={() => {
                                                    dispatch(setLyricsOpen(true));
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
                                                <SleepTimer showLabel />
                                            </div>

                                            {isDownloading ? (
                                                <div className="px-4 py-3 flex items-center gap-3 text-sm text-gray-400">
                                                    <AiOutlineLoading3Quarters className="animate-spin text-primary" />
                                                    Downloading...
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        const songUrl = getSongUrl(currentSong);
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
                                <HiSpeakerWave className="text-gray-700 dark:text-gray-200 hover:text-primary text-2xl lg:text-3xl cursor-pointer hidden lg:block transition-colors" />
                                <div
                                    className={`absolute bottom-full right-0 mb-4 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-xl rounded-2xl border border-white/20 transition-all duration-300 ${
                                        isVolumeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                                    }`}
                                >
                                    <div className="h-24 flex flex-col items-center gap-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={userVolume}
                                            onChange={(e) => setUserVolume(parseFloat(e.target.value))}
                                            className="h-20 appearance-none bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                                            style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
                                        />
                                        <span className="text-[10px] font-bold text-gray-500">{Math.round(userVolume * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <MobileNowPlaying
                        isOpen={isMobilePlayerOpen}
                        onClose={() => setIsMobilePlayerOpen(false)}
                        prevSong={prevSong}
                        nextSong={() => playNextInQueue(true)}
                        handlePlayPause={handlePlayPause}
                        imageUrl={imageUrl || ''}
                        audioRefs={[audioRefA, audioRefB]}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Player;
