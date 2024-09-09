import { Link, useNavigate } from 'react-router-dom';
import { MdKeyboardArrowDown } from 'react-icons/md';
import axios from 'axios';
import { useState, useCallback, useEffect } from 'react';
import { search } from '../constants';
import { debounce } from 'lodash';
import ThemeToggle from './ThemeToggle';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from '../features/language/languageSlice';
import { setSearchedSongs } from '../features/musicPlayer/musicPlayerSlice';

const Navbar = () => {
    const languages = [
        'Hindi',
        'Bengali',
        'Telugu',
        'English',
        'Marathi',
        'Tamil',
        'Gujarati',
        'Urdu',
        'Kannada',
        'Odia',
        'Malayalam',
        'Punjabi',
        'Assamese',
        'Maithili',
        'Santali',
        'Kashmiri',
        'Konkani',
        'Dogri',
        'Manipuri',
        'Bodo',
        'Sanskrit',
        'Sindhi',
    ];
    const dispatch = useDispatch();
    const selectedLanguage = useSelector((state) => state.language);
    const [query, setQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();

    // Debounce the search function to prevent rapid API calls
    const searchSongs = debounce(async (query) => {
        if (!query) {
            dispatch(setSearchedSongs([]));
            return;
        }
        try {
            const res = await axios.get(`${search}${query}`);
            const { data } = res.data;
            dispatch(
                setSearchedSongs([
                    ...data.songs.results,
                    ...data.albums.results,
                    ...data.artists.results,
                    ...data.playlists.results,
                ])
            );
        } catch (error) {
            console.error('Error fetching search results:', error);
            dispatch(setSearchedSongs([]));
        }
    }, 300);

    // Handle search input change
    const handleInputChange = (e) => {
        setQuery(e.target.value);
        searchSongs(e.target.value);
    };

    // Toggle dropdown visibility
    const handleDropdownToggle = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    // Handle language selection
    const handleLanguageSelect = (language) => {
        dispatch(setLanguage(language));
        setIsDropdownOpen(false);
    };

    return (
        <nav className="lg:flex dark:bg-gray-800 dark:text-white justify-between items-center py-3 px-4 fixed top-0 left-0 right-0 bg-[#f5f5f5] z-20 shadow-md">
            {/* Logo and Title */}
            <div className="flex flex-col lg:flex-row items-center gap-4">
                <div
                    className="flex items-center gap-2 pb-2"
                    onClick={() => navigate('/')}
                >
                    <img
                        src="/ios/40.png"
                        alt="logo"
                        width={30}
                        height={30}
                    />
                    <span
                        // to="/"
                        className="font-extrabold text-lg hover:text-gray-700"
                    >
                        Music Beta
                    </span>
                </div>
            </div>

            {/* Mobile View: Search Input, Language Dropdown, Theme Toggle */}
            <div className="flex items-center gap-4 lg:gap-6">
                <input
                    type="text"
                    name="search"
                    id="search"
                    className="py-2 px-4 rounded-full w-full lg:w-[44vw] outline-none text-black dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm focus:border-gray-500 dark:focus:border-gray-400 transition-colors duration-300"
                    placeholder="Search"
                    autoComplete="off"
                    autoCorrect="off"
                    value={query}
                    onChange={handleInputChange}
                />

                <div className="relative">
                    <button
                        onClick={handleDropdownToggle}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none"
                    >
                        {selectedLanguage.slice(0, 2)} <MdKeyboardArrowDown />
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                            <ul>
                                {languages.map((language) => (
                                    <li
                                        key={language}
                                        onClick={() =>
                                            handleLanguageSelect(language)
                                        }
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        {language}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <ThemeToggle />
            </div>
        </nav>
    );
};

export default Navbar;
