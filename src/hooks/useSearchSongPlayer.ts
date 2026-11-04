import { useState, useRef, useCallback } from 'react';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { showToast } from '../features/ui/uiSlice';
import { musicApiService } from '../services/musicApiService';
import { mapApiSongToSong } from '../services/favoriteRecoveryService';
import { Song } from '../types/music';

/**
 * Hook to handle selecting and playing a song from search results.
 * Resolves full song details with media URLs, manages loading state,
 * handles cancellation/stale requests, and reports user-friendly errors.
 */
export const useSearchSongPlayer = () => {
    const dispatch = useAppDispatch();
    const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
    const activeRequestIdRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const playSearchSong = useCallback(async (song: any) => {
        if (!song || !song.id) return;

        // If the song is already loading, prevent rapid duplicate clicks
        if (loadingSongId === song.id) {
            return;
        }

        // If the song already has playable media stream(s), play it directly
        const hasDirectMedia = (
            (typeof song.downloadUrl === 'string' && song.downloadUrl.trim() !== '') ||
            (Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) ||
            (typeof song.music === 'string' && song.music.trim() !== '') ||
            (Array.isArray(song.music) && song.music.length > 0)
        );

        if (hasDirectMedia) {
            const normalized = mapApiSongToSong(song, song.id, song);
            dispatch(playMusic({ ...normalized, forcePlay: true }));
            return;
        }

        // Cancel previous pending detail request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const currentId = song.id;
        activeRequestIdRef.current = currentId;
        setLoadingSongId(currentId);

        try {
            const path = `/api/songs/${encodeURIComponent(currentId)}`;
            const res = await musicApiService.fetchWithFallback(path, {
                signal: controller.signal,
                timeout: 7000,
            });

            // Guard against stale responses or cancellations
            if (controller.signal.aborted || activeRequestIdRef.current !== currentId) {
                return;
            }

            const rawData = res.data?.data;
            const detailItem = Array.isArray(rawData) ? rawData[0] : rawData;

            if (!detailItem) {
                throw new Error('Song details not found');
            }

            const normalizedSong = mapApiSongToSong(detailItem, currentId, song);

            // Verify playable media URL exists
            const hasPlayableUrl = (
                (typeof normalizedSong.downloadUrl === 'string' && normalizedSong.downloadUrl.trim() !== '') ||
                (Array.isArray(normalizedSong.downloadUrl) && normalizedSong.downloadUrl.length > 0) ||
                (typeof normalizedSong.music === 'string' && normalizedSong.music.trim() !== '') ||
                (Array.isArray(normalizedSong.music) && normalizedSong.music.length > 0)
            );

            if (!hasPlayableUrl) {
                throw new Error('No playable audio stream available');
            }

            dispatch(playMusic({ ...normalizedSong, forcePlay: true }));
        } catch (error: any) {
            if (error?.name === 'CanceledError' || controller.signal.aborted) {
                return;
            }
            console.error('Failed to resolve search song for playback:', error);
            dispatch(showToast({
                message: 'Unable to play selected song. Please try another track.',
                type: 'error',
            }));
        } finally {
            if (activeRequestIdRef.current === currentId) {
                setLoadingSongId(null);
            }
        }
    }, [dispatch, loadingSongId]);

    const cancelLoading = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        activeRequestIdRef.current = null;
        setLoadingSongId(null);
    }, []);

    return {
        playSearchSong,
        loadingSongId,
        cancelLoading,
    };
};
