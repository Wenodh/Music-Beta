import { GoPlay } from "react-icons/go";
import { useContext } from "react";
import MusicContext from "../context/MusicContext";
import { FaPause, FaPlay } from "react-icons/fa";
import { LuHardDriveDownload } from "react-icons/lu";

const SongsList = ({
  name,
  artists,
  duration,
  downloadUrl,
  image,
  id,
}) => {
  const convertTime = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds}`;
  };
const primaryArtists = artists?.primary?.[0]?.name || ""
  const { isPlaying, currentSong, playMusic } = useContext(MusicContext);
  const handleDownloadSong = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${name}.mp3`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
    } catch (error) {
      console.log("Error fetching or downloading files", error);
    }
  };
  return (
    <div className="flex justify-between items-center w-[80vw] lg:w-[50vw] mb-2 lg:mb-1 py-2 px-4 hover:bg-white hover:shadow-md rounded-md shadow-sm bg-white/65">
      {/* <GoPlay className={`text-3xl ${
      downloadUrl ? "text-gray-500 hover:text-gray-700 cursor-pointer" : "text-gray-300 cursor-not-allowed"
        } transition-all ease-in-out duration-300`} onClick={() => downloadUrl?.length && playMusic(downloadUrl, name, duration, image, id, primaryArtists)} /> */}
      { id === currentSong?.id && isPlaying ? (
            <FaPause
              className="text-gray-700 hover:text-gray-500 cursor-pointer"
              onClick={() => downloadUrl?.length && playMusic(downloadUrl, name, duration, image, id, primaryArtists)
              }
            />
          ) : (
            <FaPlay
              className="text-gray-700 hover:text-gray-500 cursor-pointer"
              onClick={() => downloadUrl?.length && playMusic(downloadUrl, name, duration, image, id, primaryArtists)}
            />
          )}

      <div className="flex flex-col lg:flex-row gap-2 justify-between items-start w-[80%]">
        <span
          className={`font-bold text-xs ${
            id === currentSong?.id && "text-[#46c7b6ff]"
          }`}
        >
          {name}
        </span>
        <span className="font-thin text-xs text-gray-500">
          {primaryArtists}
        </span>
      </div>

      <div>
        <span className="font-thin text-xs text-gray-500 hidden lg:block">
          {convertTime(duration)}
        </span>
      </div>
      <LuHardDriveDownload
            onClick={() => handleDownloadSong(downloadUrl[downloadUrl.length-1].url)}
            className="text-gray-700 hover:text-gray-500 text-2xl lg:text-3xl cursor-pointer lg:mr-2"
          />
    </div>
  );
};

export default SongsList;
