import { BiSun, BiMoon } from 'react-icons/bi';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setDarkMode } from '../features/ui/uiSlice';

const ThemeToggle = () => {
    const dispatch = useAppDispatch();
    const { darkMode } = useAppSelector((state) => state.ui.theme);

    return (
        <button
            onClick={() => dispatch(setDarkMode(!darkMode))}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
        >
            {darkMode ? <BiSun size={20} /> : <BiMoon size={20} />}
        </button>
    );
};

export default ThemeToggle;
