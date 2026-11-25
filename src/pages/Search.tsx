import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setSearchedSongs } from '../features/musicplayer/musicPlayerSlice';
import { musicApiService } from '../services/musicApiService';
import { IoSearchOutline } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { useSearchSongPlayer } from '../hooks/useSearchSongPlayer';

const SearchPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { theme } = useAppSelector((state) => state.ui);
    const { searchedSongs, isSearching, searchError, searchQuery } = useAppSelector((state) => state.musicPlayer);
    const data = Array.isArray(searchedSongs) ? { songs: { results: searchedSongs } } : searchedSongs;
    const [activeTab, setActiveTab] = useState<'all' | 'songs' | 'albums' | 'artists' | 'playlists'>('all');
    type SearchCategory = 'songs' | 'albums' | 'artists' | 'playlists';
    const SEARCH_PAGE_SIZE = 10;
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [nextPages, setNextPages] = useState<Record<SearchCategory, number>>({
        songs: 1, albums: 1, artists: 1, playlists: 1,
    });
    const [exhausted, setExhausted] = useState<Record<SearchCategory, boolean>>({
        songs: false, albums: false, artists: false, playlists: false,
    });
    const loadingMoreRef = useRef(false);
    const loadMoreControllerRef = useRef<AbortController | null>(null);
    const searchQueryRef = useRef(searchQuery);
    const { playSearchSong, loadingSongId } = useSearchSongPlayer();

    useEffect(() => {
        searchQueryRef.current = searchQuery;
        setActiveTab('all');
        setNextPages({ songs: 1, albums: 1, artists: 1, playlists: 1 });
        setExhausted({ songs: false, albums: false, artists: false, playlists: false });
        setLoadMoreError(null);
        loadingMoreRef.current = false;
        setLoadingMore(false);
        loadMoreControllerRef.current?.abort();
        loadMoreControllerRef.current = null;
    }, [searchQuery]);

    useEffect(() => () => loadMoreControllerRef.current?.abort(), []);

    const categories: SearchCategory[] = ['songs', 'albums', 'artists', 'playlists'];
    const canLoadMoreCategory = (category: SearchCategory) => {
        const section = data?.[category];
        const results = section?.results || [];
        const total = Number(section?.total);
        const start = Number(section?.start || 0);
        if (Number.isFinite(total) && total > 0) return start + results.length < total && !exhausted[category];

        // Some search providers omit total/hasMore on the initial response.
        // Optimistically allow one more request for any populated category;
        // a short or empty next page will mark it exhausted.
        const hasMore = section?.hasMore ?? section?.has_more;
        if (typeof hasMore === 'boolean') return hasMore && !exhausted[category];
        return results.length > 0 && !exhausted[category];
    };

    const loadMoreCategories: SearchCategory[] = activeTab === 'all'
        ? categories.filter(canLoadMoreCategory)
        : categories.includes(activeTab as SearchCategory) && canLoadMoreCategory(activeTab as SearchCategory)
            ? [activeTab as SearchCategory]
            : [];

    const handleShowMore = async () => {
        if (loadingMoreRef.current || !searchQuery.trim() || !loadMoreCategories.length) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setLoadMoreError(null);

        const queryAtStart = searchQuery;
        const controller = new AbortController();
        loadMoreControllerRef.current?.abort();
        loadMoreControllerRef.current = controller;

        try {
            const responses = await Promise.allSettled(loadMoreCategories.map(category =>
                musicApiService.fetchWithFallback(
                    `/api/search/${category}?query=${encodeURIComponent(queryAtStart)}&page=${nextPages[category]}&limit=${SEARCH_PAGE_SIZE}`,
                    { timeout: 7000, signal: controller.signal }
                )
            ));

            if (controller.signal.aborted || searchQueryRef.current !== queryAtStart) return;

            let nextData = { ...(Array.isArray(searchedSongs) ? { songs: { results: searchedSongs } } : searchedSongs) } as any;
            let successful = 0;

            responses.forEach((result, index) => {
                const category = loadMoreCategories[index];
                if (result.status !== 'fulfilled') return;
                successful += 1;

                const payload = result.value.data?.data || result.value.data || {};
                const incoming = Array.isArray(payload.results) ? payload.results : [];
                const existingSection = nextData[category] || {};
                const existing = existingSection.results || [];
                const seen = new Set(existing.map((item: any) => item?.id).filter(Boolean));
                const uniqueIncoming = incoming.filter((item: any) => {
                    if (!item?.id || seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                });
                const merged = [...existing, ...uniqueIncoming];

                nextData[category] = {
                    ...existingSection,
                    ...payload,
                    // Keep the first page's starting offset; results now contain all pages.
                    start: existingSection.start ?? payload.start,
                    results: merged,
                };

                setNextPages(previous => ({ ...previous, [category]: previous[category] + 1 }));
                const total = Number(payload.total ?? existingSection.total);
                const firstStart = Number(existingSection.start ?? payload.start ?? 0);
                const hasTotal = Number.isFinite(total) && total > 0;
                // Stop when the provider returns a short/empty page, reports
                // the end explicitly, or repeats a page without adding new IDs.
                const providerHasMore = payload.hasMore ?? payload.has_more;
                if (
                    incoming.length < SEARCH_PAGE_SIZE ||
                    uniqueIncoming.length === 0 ||
                    providerHasMore === false ||
                    (hasTotal && firstStart + merged.length >= total)
                ) {
                    setExhausted(previous => ({ ...previous, [category]: true }));
                }
            });

            if (successful > 0) dispatch(setSearchedSongs(nextData));
            if (successful < loadMoreCategories.length) {
                setLoadMoreError('Some results could not be loaded. Try again.');
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                console.warn('[Search] Unable to load more results', error);
                setLoadMoreError('Unable to load more results. Please try again.');
            }
        } finally {
            if (loadMoreControllerRef.current === controller) {
                loadMoreControllerRef.current = null;
                loadingMoreRef.current = false;
                setLoadingMore(false);
            }
        }
    };

    const songs = data?.songs?.results || [];
    const albums = data?.albums?.results || [];
    const artists = data?.artists?.results || [];
    const playlists = data?.playlists?.results || [];
    const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0 || playlists.length > 0;

    const tabs = [
        { id: 'all', label: 'All', count: songs.length + albums.length + artists.length + playlists.length },
        { id: 'songs', label: 'Songs', count: songs.length },
        { id: 'albums', label: 'Albums', count: albums.length },
        { id: 'artists', label: 'Artists', count: artists.length },
        { id: 'playlists', label: 'Playlists', count: playlists.length },
    ].filter(t => t.count > 0);

    return (
        <div className="pb-32 pt-4 px-2 sm:px-4">
            {isSearching && !hasResults ? (
                <div>
                    <div className="flex items-center gap-2 mb-6 text-sm text-primary font-semibold">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Searching Vibe On...</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                                <div className="w-full aspect-square rounded-xl bg-gray-200/20 dark:bg-neutral-800/60" />
                                <div className="h-4 w-3/4 bg-gray-200/20 dark:bg-neutral-800/60 rounded" />
                                <div className="h-3 w-1/2 bg-gray-200/20 dark:bg-neutral-800/60 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : searchError ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                        <IoSearchOutline size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Search Error</h3>
                    <p className="text-sm text-gray-400 max-w-sm mb-6">{searchError}</p>
                    {searchQuery && (
                        <button
                            onClick={() => {
                                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                                if (input) {
                                    input.focus();
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            }}
                            className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                        >
                            Retry Search
                        </button>
                    )}
                </div>
            ) : !hasResults ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${theme.isOled ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-800'} text-gray-400`}
                    >
                        <IoSearchOutline size={40} />
                    </motion.div>
                    {searchQuery ? (
                        <>
                            <h2 className="text-2xl font-bold mb-2">No results found</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                We couldn't find any songs, albums, or artists matching "{searchQuery}". Try another keyword or check spelling.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold mb-2">Search Vibe On</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                Use the search bar at the top to find your favorite songs, albums, and artists.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-4 mb-4 border-b border-white/10">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    setLoadMoreError(null);
                                }}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                        >
                            {(activeTab === 'songs' || activeTab === 'all') && songs.map((song: any) => {
                                const isLoadingThisSong = loadingSongId === song.id;
                                return (
                                    <div
                                        key={song.id}
                                        onClick={() => playSearchSong(song)}
                                        className={`cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all relative ${
                                            isLoadingThisSong ? 'ring-2 ring-primary/80 opacity-90' : ''
                                        }`}
                                    >
                                        <div className="relative aspect-square mb-2.5 overflow-hidden rounded-xl">
                                            <img
                                                src={song.image?.[2]?.url || (Array.isArray(song.image) ? song.image[0]?.url : song.image)}
                                                alt={song.name || song.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                                                isLoadingThisSong ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                            }`}>
                                                {isLoadingThisSong ? (
                                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                                        <span>▶</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(song.name || song.title)}</p>
                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{decodeHtmlEntities(song.primaryArtists || song.singers || song.artist || '')}</p>
                                    </div>
                                );
                            })}

                            {(activeTab === 'albums' || activeTab === 'all') && albums.map((album: any) => (
                                <div
                                    key={album.id}
                                    onClick={() => navigate(`/albums/${album.id}`)}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-xl">
                                        <img
                                            src={album.image?.[2]?.url || album.image}
                                            alt={album.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(album.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Album • {decodeHtmlEntities(album.artist)}</p>
                                </div>
                            ))}

                            {(activeTab === 'artists' || activeTab === 'all') && artists.map((artist: any) => (
                                <div
                                    key={artist.id}
                                    onClick={() => navigate(`/artists/${artist.id}`)}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all flex flex-col items-center text-center"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-full w-24 h-24 ring-2 ring-primary/10">
                                        <img
                                            src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url || artist.image}
                                            alt={artist.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white truncate w-full">{decodeHtmlEntities(artist.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5 uppercase tracking-wider">{artist.role || artist.category || 'Artist'}{artist.followerCount ? ` • ${Number(artist.followerCount).toLocaleString()} followers` : ''}</p>
                                    {artist.description && <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{decodeHtmlEntities(artist.description)}</p>}
                                </div>
                            ))}

                            {(activeTab === 'playlists' || activeTab === 'all') && playlists.map((playlist: any) => (
                                <div
                                    key={playlist.id}
                                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                                    className="cursor-pointer group bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 hover:border-primary/40 transition-all"
                                >
                                    <div className="relative aspect-square mb-2.5 overflow-hidden rounded-xl">
                                        <img
                                            src={playlist.image?.[2]?.url || playlist.image}
                                            alt={playlist.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{decodeHtmlEntities(playlist.name)}</p>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Playlist</p>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                    {searchQuery && loadMoreCategories.length > 0 && (
                        <div className="flex flex-col items-center gap-2 mt-6">
                            <button
                                disabled={loadingMore}
                                onClick={handleShowMore}
                                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-primary/20 border border-white/10 text-sm font-bold disabled:opacity-50"
                            >
                                {loadingMore ? 'Loading…' : 'Show more'}
                            </button>
                            {loadMoreError && <p role="alert" className="text-xs text-red-400">{loadMoreError}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPage;
