import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { playlistById } from '../constants';
import { extractImageUrl } from '../utils/imageUtils';

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { playlistCollaborationService, PlaylistCollaborator } from '../services/playlistCollaborationService';
import { setPlaylistNormalizedItems, togglePlaylistCollaborative } from '../features/library/librarySlice';
import { supabase } from '../lib/supabase';
import { IoPeopleOutline } from 'react-icons/io5';
import { showToast } from '../features/ui/uiSlice';

const PlaylistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const apiUrl = `${playlistById}${id}`;

    const playlists = useAppSelector((state) => state.library.playlists);
    const user = useAppSelector((state) => state.auth.user);
    const playlist = playlists.find((p) => p.id === id);

    const [collaborators, setCollaborators] = useState<PlaylistCollaborator[]>([]);

    useEffect(() => {
        if (!id || !playlist?.isCollaborative) return;

        playlistCollaborationService.fetchPlaylistItems(id).then(items => {
            if (items.length > 0) {
                dispatch(setPlaylistNormalizedItems({ playlistId: id, items }));
            }
        });

        playlistCollaborationService.fetchCollaborators(id).then(collabs => {
            setCollaborators(collabs);
        });

        const channel = supabase.channel(`playlist:${id}`);
        channel
            .on('broadcast', { event: 'item_added' }, () => {
                playlistCollaborationService.fetchPlaylistItems(id).then(items => {
                    dispatch(setPlaylistNormalizedItems({ playlistId: id, items }));
                });
            })
            .on('broadcast', { event: 'item_removed' }, () => {
                playlistCollaborationService.fetchPlaylistItems(id).then(items => {
                    dispatch(setPlaylistNormalizedItems({ playlistId: id, items }));
                });
            })
            .on('broadcast', { event: 'items_reordered' }, () => {
                playlistCollaborationService.fetchPlaylistItems(id).then(items => {
                    dispatch(setPlaylistNormalizedItems({ playlistId: id, items }));
                });
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [id, playlist?.isCollaborative, dispatch]);

    const handleToggleCollab = () => {
        if (!user) {
            dispatch(showToast({ message: 'Sign in to enable collaboration', type: 'error' }));
            return;
        }
        if (!id) return;
        const nextState = !playlist?.isCollaborative;
        dispatch(togglePlaylistCollaborative({ playlistId: id, isCollaborative: nextState }));
        dispatch(showToast({ message: nextState ? 'Collaboration enabled!' : 'Collaboration disabled' }));
    };

    // If it's a local/user-created playlist (found in state.library.playlists), render songs from state
    if (playlist) {
        return (
            <div className="relative">
                <div className="mx-4 sm:mx-8 mt-2 mb-2 flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                            playlist.isCollaborative
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                        }`}>
                            <IoPeopleOutline size={15} />
                            {playlist.isCollaborative ? 'Collaborative' : 'Private Playlist'}
                        </span>

                        {playlist.isCollaborative && collaborators.length > 0 && (
                            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                                • {collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToggleCollab}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary hover:bg-red-600 text-white shadow-md shadow-primary/20 transition-all active:scale-95"
                        >
                            {playlist.isCollaborative ? 'Collab Active' : 'Make Collaborative'}
                        </button>
                    </div>
                </div>

                <PageTemplate
                    id={id || ''}
                    type="playlist"
                    songs={playlist.songs || []}
                    title={playlist.name || 'Playlist'}
                    image={playlist.songs?.[0]?.image}
                    showFavoritesOnly={false}
                />
            </div>
        );
    }

    // Otherwise, render catalog playlist via JioSaavn API
    return <PageTemplate apiUrl={apiUrl} getImageUrl={extractImageUrl} />;
};

export default PlaylistPage;
