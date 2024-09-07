import { useState, useEffect, useMemo, useContext } from "react";
import axios from "axios";
import AlbumItem from "./AlbumItem";
import Slider from "./Slider";
import { album, playlistSearch, songs } from "../constants";
import MusicContext from "../context/MusicContext";

const MainSection = () => {
  const [albums, setAlbums] = useState([]);
  const [trending, setTrending] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const { setSongs } = useContext(MusicContext);
  const getHomePageData = async () => {
    const res = await axios.get(album+"?query=telugu&page=0&limit=25");
    const { data } = res.data;
    setAlbums(data.results);
    const trendingSongs = await axios.get( songs + `?query=telugu&page=0&limit=25`);
    setTrending(trendingSongs?.data?.data?.results || []);
    if (trendingSongs?.data?.data?.results?.[0]?.type === "song") setSongs(trendingSongs?.data?.data?.results)
    const topPlaylists = await axios.get(playlistSearch + "telugu")
    setPlaylists(topPlaylists?.data?.data?.results || [])
  };

  useEffect(() => {
    getHomePageData();
  }, []);

  const trendingAlbums = useMemo(
    () => (Array.isArray(trending) ? trending : []),
    [trending]
  );

  return (
    <section className="my-24">
      <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 w-full lg:w-[78vw] mx-auto">
        Trending Now
      </h2>
      <Slider data={trendingAlbums} />
      <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 w-full lg:w-[78vw] mx-auto">
        Top Albums
      </h2>
      <Slider data={albums} />
      <h2 className="text-xl px-5 py-3 font-semibold text-gray-700 w-full lg:w-[78vw] mx-auto">
        Top Playlist
      </h2>
      <Slider data={playlists}/>
    </section>
  );
};

export default MainSection;
