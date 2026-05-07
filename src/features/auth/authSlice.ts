import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@supabase/supabase-js';

interface AuthState {
    user: {
        id: string;
        email?: string;
        user_metadata: any;
    } | null;
    session: any | null;
    loading: boolean;
    error: string | null;
    isAuthModalOpen: boolean;
}

const initialState: AuthState = {
    user: null,
    session: null,
    loading: true,
    error: null,
    isAuthModalOpen: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setSession: (state, action: PayloadAction<any>) => {
            state.session = action.payload;
            state.user = action.payload?.user ? {
                id: action.payload.user.id,
                email: action.payload.user.email,
                user_metadata: action.payload.user.user_metadata,
            } : null;
            state.loading = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        setAuthModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isAuthModalOpen = action.payload;
        },
        logout: (state) => {
            state.user = null;
            state.session = null;
            state.loading = false;
        }
    },
});

export const { setSession, setLoading, setError, setAuthModalOpen, logout } = authSlice.actions;
export default authSlice.reducer;
