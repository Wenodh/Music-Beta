import { supabase } from '../../lib/supabase';
import { AppDispatch } from '../../store';
import { clearLibrary } from '../library/librarySlice';
import { setLoading, setError, setUser } from './authSlice';
import { Capacitor } from '@capacitor/core';

export const signInWithGoogle = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));

    // For Android/iOS, use the custom URL scheme. For Web, use the current origin.
    const redirectUrl = Capacitor.isNativePlatform()
        ? 'com.wenodh.vibeon://login'
        : window.location.origin;

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
    }
};
