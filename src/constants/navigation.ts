import {
    IoHomeOutline, IoHome,
    IoCompassOutline, IoCompass,
    IoSearchOutline, IoSearch,
    IoGlobeOutline, IoGlobe,
    IoLibraryOutline, IoLibrary,
    IoPersonOutline, IoPerson,
    IoGameControllerOutline, IoGameController,
    IoPeopleOutline, IoPeople,
    IoHeartOutline, IoHeart,
    IoCloudDownloadOutline, IoCloudDownload,
    IoListOutline, IoList
} from 'react-icons/io5';
import { IconType } from 'react-icons';

export interface NavItemConfig {
    id: string;
    label: string;
    description: string;
    path: string;
    icon: IconType;
    activeIcon: IconType;
    isRemovable: boolean;
}

export const ALL_MOBILE_NAV_ITEMS: NavItemConfig[] = [
    {
        id: 'home',
        label: 'Home',
        description: 'Main feeds, quick picks and daily music mixes',
        path: '/',
        icon: IoHomeOutline,
        activeIcon: IoHome,
        isRemovable: false, // Essential navigation cannot be turned off
    },
    {
        id: 'explore',
        label: 'Explore',
        description: 'Trending albums, artists, genres and audiobooks',
        path: '/explore',
        icon: IoCompassOutline,
        activeIcon: IoCompass,
        isRemovable: true,
    },
    {
        id: 'search',
        label: 'Search',
        description: 'Instant search across songs, artists and playlists',
        path: '/search',
        icon: IoSearchOutline,
        activeIcon: IoSearch,
        isRemovable: true,
    },
    {
        id: 'globe',
        label: 'Globe',
        description: '3D interactive globe with worldwide music trends',
        path: '/globe',
        icon: IoGlobeOutline,
        activeIcon: IoGlobe,
        isRemovable: true,
    },
    {
        id: 'library',
        label: 'Library',
        description: 'Your saved favorites, custom playlists and downloads',
        path: '/library',
        icon: IoLibraryOutline,
        activeIcon: IoLibrary,
        isRemovable: true,
    },
    {
        id: 'profile',
        label: 'Profile',
        description: 'Account settings, download manager & favorites repair',
        path: '/profile',
        icon: IoPersonOutline,
        activeIcon: IoPerson,
        isRemovable: true,
    },
    {
        id: 'arcade',
        label: 'Arcade',
        description: 'Play music-synced mini games like Flappy Star and Snake',
        path: '/arcade',
        icon: IoGameControllerOutline,
        activeIcon: IoGameController,
        isRemovable: true,
    },
    {
        id: 'favorites',
        label: 'Favorites',
        description: 'Instant access to your favorite loved songs',
        path: '/library?tab=favorites',
        icon: IoHeartOutline,
        activeIcon: IoHeart,
        isRemovable: true,
    },
    {
        id: 'offline',
        label: 'Offline',
        description: 'Downloaded songs available without internet',
        path: '/library?tab=offline',
        icon: IoCloudDownloadOutline,
        activeIcon: IoCloudDownload,
        isRemovable: true,
    },
    {
        id: 'playlists',
        label: 'Playlists',
        description: 'Your custom organized music playlists',
        path: '/library?tab=playlists',
        icon: IoListOutline,
        activeIcon: IoList,
        isRemovable: true,
    },
    {
        id: 'friends',
        label: 'Friends',
        description: 'Direct messaging and voice calling with your friends',
        path: '/friends', // Handled via modal
        icon: IoPeopleOutline,
        activeIcon: IoPeople,
        isRemovable: true,
    },
];

export const DEFAULT_VISIBLE_NAV_IDS: string[] = [
    'home',
    'explore',
    'search',
    'globe',
    'library',
    'profile',
];
