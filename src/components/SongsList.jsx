import { useState, useContext } from 'react';
import { FaPause, FaPlay } from 'react-icons/fa';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai'; // For spinner
import MusicContext from '../context/MusicContext';

const SongsList = ({ name, artists, duration, downloadUrl, image, id }) => {
    const { isPlaying, currentSong, playMusic } = useContext(MusicContext);
    const [isDownloading, setIsDownloading] = useState(false); // Track download status
    const primaryArtists = artists?.primary?.[0]?.name || '';
    const isCurrentSongPlaying = id === currentSong?.id && isPlaying;

    const convertTime = (duration) => {
        const minutes = String(Math.floor(duration / 60)).padStart(2, '0');
        const seconds = String(duration % 60).padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleDownloadSong = async (url) => {
        if (!url) return;
        setIsDownloading(true); // Set loading state
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${name}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading file', error);
        } finally {
            setIsDownloading(false); // Reset loading state after download
        }
    };

    return (
        <div className="flex justify-between items-center w-[80vw] lg:w-[50vw] mb-2 lg:mb-1 py-2 px-4 hover:bg-white hover:shadow-md rounded-md shadow-sm bg-white/65 gap-4">
            {isCurrentSongPlaying ? (
                <FaPause
                    className="text-gray-700 hover:text-gray-500 cursor-pointer"
                    onClick={() =>
                        downloadUrl?.length &&
                        playMusic(
                            downloadUrl,
                            name,
                            duration,
                            image,
                            id,
                            primaryArtists
                        )
                    }
                    aria-label="Pause"
                />
            ) : (
                <FaPlay
                    className="text-gray-700 hover:text-gray-500 cursor-pointer"
                    onClick={() =>
                        downloadUrl?.length &&
                        playMusic(
                            downloadUrl,
                            name,
                            duration,
                            image,
                            id,
                            primaryArtists
                        )
                    }
                    aria-label="Play"
                />
            )}

            <div className="flex flex-col lg:flex-row gap-0.5 md:gap-2 justify-between items-start w-[80%]">
                <span
                    className={`font-bold text-xs ${
                        id === currentSong?.id && 'text-[#46c7b6ff]'
                    }`}
                >
                    {name}
                </span>
                <span className="font-thin text-xs text-gray-500">
                    {primaryArtists}
                </span>
            </div>

            <span className="font-thin text-xs text-gray-500 hidden lg:block">
                {convertTime(duration)}
            </span>

            {isDownloading ? (
                <AiOutlineLoading3Quarters className="animate-spin text-gray-700 text-2xl lg:text-3xl cursor-wait lg:mr-2" />
            ) : (
                <LuHardDriveDownload
                    onClick={() =>
                        handleDownloadSong(
                            downloadUrl?.[downloadUrl.length - 1]?.url
                        )
                    }
                    className={`text-gray-700 hover:text-gray-500 text-2xl lg:text-3xl ${
                        !downloadUrl || isDownloading
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer'
                    } lg:mr-2`}
                    aria-label="Download"
                    disabled={!downloadUrl || isDownloading}
                />
            )}
        </div>
    );
};

export default SongsList;
