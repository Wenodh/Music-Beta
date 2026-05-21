import { supabase } from '../../lib/supabase';
import { AppDispatch } from '../../store';
import { setLoading, setError, setUser } from './authSlice';

export const signInWithGoogle = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
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
    }
};
