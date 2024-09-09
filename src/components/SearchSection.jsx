import SongItem from "./SongItem";
import { useSelector } from "react-redux";

const SearchSection = () => {
  const searchedSongs = useSelector((state) => state.musicPlayer?.searchedSongs);
  return (
    <div
      className={`fixed left-0 right-0 bottom-0 top-0 py-24 flex justify-center items-center flex-wrap gap-4 bg-white bg-opacity-50 backdrop-blur-lg ${
        !searchedSongs?.length ? "-translate-y-[1200px]" : "translate-y-0"
      } transition-all duration-500 ease-linear z-10 overflow-y-auto`}
    >
      {searchedSongs?.map((song) => (
        <SongItem key={song.id} {...song} />
      ))}
    </div>
  );
};

export default SearchSection;
