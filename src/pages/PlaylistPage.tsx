import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { playlistById } from '../constants';
import { useCollaborativePlaylist } from '../features/social/hooks/useCollaborativePlaylist';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { IoPeopleOutline } from 'react-icons/io5';
import CollaborationSettings from '../features/social/components/CollaborationSettings';
import { collaborationService } from '../features/social/services/CollaborationService';
import { showToast } from '../features/ui/uiSlice';

const PlaylistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const apiUrl = `${playlistById}?id=${id}&limit=50&page=0`;

    // Check if this is a collaborative playlist (UUID pattern)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
    const { playlist, loading, refresh } = useCollaborativePlaylist(isUUID ? id! : '');
    const { user } = useAppSelector(state => state.auth);
    const [showCollabSettings, setShowCollabSettings] = useState(false);

    const isOwner = playlist?.ownerId === user?.id;

    const handleInvite = async (userId: string, role: 'editor' | 'viewer') => {
        try {
            await collaborationService.inviteMember(id!, userId, role);
            dispatch(showToast({ message: `Invited ${userId} as ${role}` }));
            refresh();
        } catch (error) {
            dispatch(showToast({ message: 'Failed to invite user', type: 'error' }));
        }
    };

    const handleUpdateRole = async (userId: string, role: 'editor' | 'viewer') => {
        try {
            await collaborationService.inviteMember(id!, userId, role);
            refresh();
        } catch (error) {
            dispatch(showToast({ message: 'Failed to update role', type: 'error' }));
        }
    };

    const handleRemove = async (userId: string) => {
        try {
            await collaborationService.removeMember(id!, userId);
            dispatch(showToast({ message: `Removed member` }));
            refresh();
        } catch (error) {
            dispatch(showToast({ message: 'Failed to remove member', type: 'error' }));
        }
    };

    const getImageUrl = (data: any) => {
        if (Array.isArray(data?.image)) {
            return data.image.find((img: any) => img.quality === '500x500')?.url ||
                   data.image[data.image.length - 1]?.url;
        }
        return data?.image || '';
    };

    return (
        <>
            <PageTemplate
                apiUrl={isUUID ? undefined : apiUrl}
                getImageUrl={getImageUrl}
                details={playlist ? {
                    ...playlist,
                    type: 'playlist',
                    songs: playlist.tracks || []
                } : undefined}
            >
                {isUUID && (
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setShowCollabSettings(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary/10 hover:bg-secondary/20 rounded-full text-xs font-bold transition-all"
                        >
                            <IoPeopleOutline size={16} />
                            Manage Collaboration
                        </button>
                    </div>
                )}
            </PageTemplate>

            {showCollabSettings && (
                <CollaborationSettings
                    members={playlist?.members || []}
                    onInvite={handleInvite}
                    onUpdateRole={handleUpdateRole}
                    onRemove={handleRemove}
                    onClose={() => setShowCollabSettings(false)}
                    isOwner={isOwner}
                />
            )}
        </>
    );
};

export default PlaylistPage;
