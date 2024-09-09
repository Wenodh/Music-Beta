import { useState, useEffect } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa'; // Import Sun and Moon icons from react-icons

export default function ThemeToggle() {
    const [theme, setTheme] = useState(
        localStorage.getItem('theme') || 'light'
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-gray-300 dark:border-gray-600"
        >
            {theme === 'light' ? '🌙' : '🌞'}
        </button>
    );
}
