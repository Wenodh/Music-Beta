import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { profileService } from '../services/ProfileService';
import { setProfile, setLoading, setError, setCurrentUserProfile } from '../socialSlice';
import { UserProfile } from '../types';

export const useProfile = (userId?: string) => {
    const dispatch = useDispatch();
    const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
    const targetId = userId || currentUserId;

    const profile = useSelector((state: RootState) =>
        targetId ? state.social.profiles[targetId] || (targetId === currentUserId ? state.social.currentUserProfile : null) : null
    );
    const loading = useSelector((state: RootState) => state.social.loading.profile);

    const fetchProfile = useCallback(async () => {
        if (!targetId) return;

        dispatch(setLoading({ key: 'profile', value: true }));
        try {
            const data = await profileService.getProfile(targetId);
            if (data) {
                dispatch(setProfile(data));
                if (targetId === currentUserId) {
                    dispatch(setCurrentUserProfile(data));
                }
            }
        } catch (err: any) {
            dispatch(setError(err.message));
        } finally {
            dispatch(setLoading({ key: 'profile', value: false }));
        }
    }, [targetId, currentUserId, dispatch]);

    useEffect(() => {
        if (!profile && targetId) {
            fetchProfile();
        }
    }, [profile, targetId, fetchProfile]);

    const updateProfile = async (updates: Partial<UserProfile>) => {
        try {
            await profileService.updateProfile(updates);
            if (profile) {
                const updated = { ...profile, ...updates };
                dispatch(setProfile(updated as UserProfile));
                if (targetId === currentUserId) {
                    dispatch(setCurrentUserProfile(updated as UserProfile));
                }
            }
        } catch (err: any) {
            dispatch(setError(err.message));
        }
    };

    return { profile, loading, updateProfile, refresh: fetchProfile };
};
