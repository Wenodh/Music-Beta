import { BiRepeat } from 'react-icons/bi';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold } from 'react-icons/pi';
import { FaPlay, FaPause } from 'react-icons/fa';
import { HiSpeakerWave } from 'react-icons/hi2';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai'; // For spinner
import VolumeController from './VolumeController';
import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    playMusic,
    setCurrentSong,
} from '../features/musicplayer/musicPlayerSlice';
import { useNavigate } from 'react-router-dom';

const Player = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isVolumeVisible, setIsVolumeVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const { currentSong, isPlaying, songs } = useSelector(
        (state) => state.musicPlayer
    );
    // Use ref to manage the audio element
    const audioRef = useRef(new Audio(''));

    const nextSong = () => {
        if (currentSong) {
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
                    albumId: next?.album?.id,
                })
            );
        }
    };

    const prevSong = () => {
        if (currentSong) {
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
                    albumId: prev?.album?.id,
                })
            );
        }
    };

    // Handle audio play/pause when the state changes
    useEffect(() => {
        if (currentSong) {
            // Update audio src based on currentSong
            if (audioRef.current && currentSong?.music) {
                audioRef.current.src =
                    currentSong?.music[currentSong.music.length - 1]?.url || '';
            }

            if (isPlaying) {
                audioRef.current?.play();
            } else {
                audioRef.current?.pause();
            }

            const handleTimeUpdate = () => {
                const duration = Number(currentSong.duration);
                const currentTime = audioRef.current.currentTime;
                const progress = (currentTime / duration) * 100;
                document.getElementById('progress').value = progress; // Update the progress bar
            };

            const handleSongEnd = () => nextSong(); // Move to the next song

            // Add event listeners
            audioRef.current?.addEventListener('timeupdate', handleTimeUpdate);
            audioRef.current?.addEventListener('ended', handleSongEnd);

            // Cleanup listeners when component unmounts or song changes
            return () => {
                audioRef.current?.removeEventListener(
                    'timeupdate',
                    handleTimeUpdate
                );
                audioRef.current?.removeEventListener('ended', handleSongEnd);
            };
        }
    }, [currentSong, isPlaying]);

    const handleProgressChange = (event) => {
        const newPercentage = parseFloat(event.target.value);
        const newTime = (newPercentage / 100) * Number(currentSong.duration);
        if (newTime >= 0) {
            audioRef.current.currentTime = newTime;
        }
    };

    const handleDownloadSong = async (url) => {
        setIsDownloading(true);
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${currentSong.name}.mp3`;
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
            audioRef.current?.play();
        }
        dispatch(playMusic(currentSong)); // Update the playing state in Redux
    };

    return (
        <div
            className={`dark:bg-gray-800 dark:text-white fixed bottom-0 right-0 left-0 bg-[#f5f5f5ff] flex flex-col ${
                !currentSong && 'hidden'
            }`}
        >
            <input
                type="range"
                id="progress"
                min={0}
                max={100}
                step="0.1"
                defaultValue={0}
                onChange={handleProgressChange}
                className="w-full h-[5px] text-green-400 range"
            />
            <div className="flex justify-between items-center mb-3 px-3">
                {/* 1st div */}
                <div className="flex justify-start items-center gap-3 lg:w-[30vw]">
                    <img
                        src={currentSong?.image}
                        alt=""
                        width={55}
                        height={55}
                        className={`rounded-full shadow-2xl ${
                            isPlaying && 'motion-safe:animate-spin'
                        }`}
                        loading="lazy"
                        onClick={() =>
                            currentSong?.albumId &&
                            navigate(`/albums/${currentSong.albumId}`)
                        }
                    />
                    <div className="hidden lg:block">
                        <span>{currentSong?.name}</span>
                        <p className="text-xs text-gray-500">
                            {currentSong?.primaryArtists}
                        </p>
                    </div>
                </div>

                {/* 2nd div */}
                <div className="flex text-2xl lg:text-3xl gap-4 lg:gap-6 lg:w-[40vw] justify-center">
                    <BiRepeat className="text-gray-400 cursor-pointer" />
                    <IoMdSkipBackward
                        onClick={prevSong}
                        className="text-gray-700 hover:text-gray-500 cursor-pointer"
                    />
                    {isPlaying ? (
                        <FaPause
                            className="text-gray-700 hover:text-gray-500 cursor-pointer"
                            onClick={handlePlayPause}
                        />
                    ) : (
                        <FaPlay
                            className="text-gray-700 hover:text-gray-500 cursor-pointer"
                            onClick={handlePlayPause}
                        />
                    )}
                    <IoMdSkipForward
                        onClick={nextSong}
                        className="text-gray-700 hover:text-gray-500 cursor-pointer"
                    />
                    <PiShuffleBold className="text-gray-400 cursor-pointer" />
                </div>

                {/* 3rd div */}
                <div
                    className="flex lg:w-[30vw] justify-end items-center"
                    onMouseEnter={() => setIsVolumeVisible(true)}
                    onMouseLeave={() => setIsVolumeVisible(false)}
                >
                    {isDownloading ? (
                        <AiOutlineLoading3Quarters className="animate-spin text-gray-700 text-2xl lg:text-3xl cursor-wait lg:mr-2" />
                    ) : (
                        <LuHardDriveDownload
                            onClick={() =>
                                handleDownloadSong(
                                    currentSong?.music[
                                        currentSong?.music?.length - 1
                                    ]?.url
                                )
                            }
                            className={`text-gray-700 hover:text-gray-500 text-2xl lg:text-3xl ${
                                !currentSong?.music?.[
                                    currentSong?.music?.length - 1
                                ]?.url || isDownloading
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                            } lg:mr-2`}
                        />
                    )}
                    <HiSpeakerWave className="text-gray-700 hover:text-gray-500 text-2xl lg:text-3xl cursor-pointer hidden lg:block" />
                    {/* <VolumeController isVolumeVisible={isVolumeVisible} /> */}
                </div>
            </div>
        </div>
    );
};

export default Player;
