import { Link } from 'react-router-dom';
import { MdKeyboardArrowDown } from 'react-icons/md';
import axios from 'axios';
import { useContext, useState, useCallback } from 'react';
import MusicContext from '../context/MusicContext';
import { search } from '../constants';
import { debounce } from 'lodash';

const Navbar = () => {
    const { setSearchedSongs } = useContext(MusicContext);
    const [query, setQuery] = useState('');

    // Debounce the search function to prevent rapid API calls
    const searchSongs = useCallback(
        debounce(async (query) => {
            if (!query) {
                setSearchedSongs([]);
                return;
            }
            try {
                const res = await axios.get(`${search}${query}`);
                const { data } = res.data;
                setSearchedSongs([
                    ...data.songs.results,
                    ...data.albums.results,
                    ...data.artists.results,
                    ...data.playlists.results,
                ]);
            } catch (error) {
                console.error('Error fetching search results:', error);
                setSearchedSongs([]); // Clear results on error
            }
        }, 300), // Debounce with 300ms delay
        [setSearchedSongs]
    );

    // Handle search input change
    const handleInputChange = (e) => {
        setQuery(e.target.value);
        searchSongs(e.target.value);
    };

    return (
        <nav className="lg:flex justify-between items-center py-3 border-none lg:border px-2 fixed top-0 left-0 right-0 bg-[#f5f5f5ff] z-20">
            {/* Logo and Title */}
            <div className="flex flex-col lg:flex-row justify-between items-center mx-auto lg:mx-0">
                <div className="flex justify-between items-center gap-2 mr-4">
                    <img
                        src="/savan-logo.png"
                        alt="logo"
                        width={37}
                        loading="lazy"
                    />
                    <Link to="/" className="font-extrabold text-lg">
                        Music Beta
                    </Link>
                </div>
            </div>

            {/* Search Input */}
            <div>
                <input
                    type="text"
                    name="search"
                    id="search"
                    className="py-2 rounded-full w-[100%] lg:w-[44vw] outline-none text-center border text-black"
                    placeholder="Search for songs"
                    autoComplete="off"
                    autoCorrect="off"
                    value={query}
                    onChange={handleInputChange}
                />
            </div>

            {/* Optional: Additional Nav Items (currently hidden) */}
            <div className="hidden lg:flex justify-between items-center gap-4">
                {/* Additional nav content can be placed here */}
            </div>
        </nav>
    );
};

export default Navbar;
