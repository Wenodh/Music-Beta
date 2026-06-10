import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Participant {
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
}

export interface Reaction {
    id: string;
    emoji: string;
    userId: string;
    userName: string;
}

interface SessionState {
    roomCode: string | null;
    isHost: boolean;
    isJoined: boolean;
    participants: Participant[];
    reactions: Reaction[];
    error: string | null;
}

const initialState: SessionState = {
    roomCode: null,
    isHost: false,
    isJoined: false,
    participants: [],
    reactions: [],
    error: null,
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        startSession: (state, action: PayloadAction<string>) => {
            state.roomCode = action.payload;
            state.isHost = true;
            state.isJoined = true;
            state.error = null;
        },
        joinSession: (state, action: PayloadAction<string>) => {
            state.roomCode = action.payload;
            state.isHost = false;
            state.isJoined = true;
            state.error = null;
        },
        leaveSession: (state) => {
            state.roomCode = null;
            state.isHost = false;
            state.isJoined = false;
            state.participants = [];
            state.reactions = [];
            state.error = null;
        },
        setParticipants: (state, action: PayloadAction<Participant[]>) => {
            state.participants = action.payload;
        },
        addReaction: (state, action: PayloadAction<Reaction>) => {
            state.reactions.push(action.payload);
        },
        removeReaction: (state, action: PayloadAction<string>) => {
            state.reactions = state.reactions.filter(r => r.id !== action.payload);
        },
        setSessionError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const {
    startSession,
    joinSession,
    leaveSession,
    setParticipants,
    addReaction,
    removeReaction,
    setSessionError,
} = sessionSlice.actions;

export default sessionSlice.reducer;
