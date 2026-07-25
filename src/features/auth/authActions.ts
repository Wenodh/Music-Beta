import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';
import { AppDispatch } from '../../store';
import { clearLibrary } from '../library/librarySlice';
import { setLoading, setError, setUser } from './authSlice';
import { resetSettingsTimestamp } from '../ui/uiSlice';
import { setRecentlyPlayed } from '../musicplayer/musicPlayerSlice';
import { Logger } from '../../lib/logger';

export const signInWithGoogle = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));

    // Explicitly use the current origin for redirect on web to avoid cross-domain issues in multi-environment setups.
    // For native platforms, use the canonical custom URL scheme.
    const redirectUrl = Capacitor.isNativePlatform()
        ? 'com.wenodh.vibeon://auth/callback'
        : window.location.origin;

    Logger.info('Initiating Google OAuth flow', { redirectUrl });

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl,
        },
    });

    if (error) {
        dispatch(setError(error.message));
    }
};

export const signOut = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    const { error } = await supabase.auth.signOut();
    if (error) {
        dispatch(setError(error.message));
    } else {
        dispatch(setUser(null));
        dispatch(clearLibrary());
        dispatch(resetSettingsTimestamp());
        dispatch(setRecentlyPlayed([]));
    }
};
