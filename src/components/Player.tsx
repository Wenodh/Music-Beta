import { BiRepeat } from 'react-icons/bi';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold } from 'react-icons/pi';
import { FaPlay, FaPause } from 'react-icons/fa';
import { HiSpeakerWave } from 'react-icons/hi2';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai'; // For spinner
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

const Player = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isVolumeVisible, setIsVolumeVisible] = useState(false);
    const { currentSong, isPlaying, songs, sleepTimer } = useAppSelector(
        (state) => state.musicPlayer
    );
    const audioRef = useRef(new Audio(''));

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
        let interval: any;
        if (isPlaying && sleepTimer !== null && sleepTimer > 0) {
            interval = setInterval(() => {
                dispatch(decrementSleepTimer());
            }, 60000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, sleepTimer, dispatch]);

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

    const imageUrl = typeof currentSong?.image === 'string' ? currentSong?.image : currentSong?.image?.[currentSong?.image?.length - 1]?.url;

    return (
        <AnimatePresence>
            {currentSong && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="dark:bg-gray-900/80 dark:text-white fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-lg border-t border-white/20 dark:border-gray-800/20 flex flex-col z-50"
                >
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
                            <motion.img
                                animate={{ rotate: isPlaying ? 360 : 0 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                src={imageUrl}
                                alt=""
                                width={55}
                                height={55}
                                className="rounded-full shadow-lg cursor-pointer"
                                loading="lazy"
                                onClick={() =>
                                    currentSong?.albumId &&
                                    navigate(`/albums/${currentSong.albumId}`)
                                }
                            />
                            <div className="hidden lg:block overflow-hidden">
                                <p className="font-semibold truncate">{currentSong?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {currentSong?.primaryArtists}
                                </p>
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
                        <div className="flex lg:w-[30vw] justify-end items-center gap-5">
                            <SleepTimer />
                            {isDownloading ? (
                                <AiOutlineLoading3Quarters className="animate-spin text-red-500 text-2xl lg:text-3xl" />
                            ) : (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }}>
                                    <LuHardDriveDownload
                                        onClick={() => {
                                            const songUrl = Array.isArray(currentSong?.music) ? currentSong?.music[currentSong?.music?.length - 1]?.url : currentSong?.music;
                                            handleDownloadSong(songUrl || '');
                                        }}
                                        className={`text-gray-700 dark:text-gray-200 hover:text-red-500 text-2xl lg:text-3xl cursor-pointer transition-colors ${
                                            !currentSong?.music && 'opacity-50 pointer-events-none'
                                        }`}
                                    />
                                </motion.div>
                            )}
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
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Player;
