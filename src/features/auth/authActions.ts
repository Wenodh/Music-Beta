import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '../../lib/supabase';
import { AppDispatch } from '../../store';
import { clearLibrary } from '../library/librarySlice';
import { setLoading, setError, setUser } from './authSlice';
import { resetSettingsTimestamp } from '../ui/uiSlice';
import { setRecentlyPlayed } from '../musicplayer/musicPlayerSlice';
import { Logger } from '../../lib/logger';

export const signInWithGoogle = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));

    const isNative = Capacitor.isNativePlatform();
    const redirectUrl = isNative
        ? 'com.wenodh.vibeon://auth/callback'
        : window.location.origin;

    Logger.info('Initiating Google OAuth flow', { redirectUrl, isNative });

    try {
        if (isNative) {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                dispatch(setError(error.message));
                dispatch(setLoading(false));
                return;
            }

            if (data?.url) {
                Logger.info('Opening OAuth URL in external native browser', { url: data.url });
                await Browser.open({ url: data.url, windowName: '_system' });
            } else {
                dispatch(setError('Failed to generate OAuth authorization URL.'));
                dispatch(setLoading(false));
            }
        } else {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                },
            });

            if (error) {
                dispatch(setError(error.message));
                dispatch(setLoading(false));
            }
        }
    } catch (err) {
        Logger.error('Exception during Google OAuth initiation', { error: err instanceof Error ? err.message : String(err) });
        dispatch(setError(err instanceof Error ? err.message : String(err)));
        dispatch(setLoading(false));
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
