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

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
    avatar?: string;
}

interface SessionState {
    roomCode: string | null;
    isHost: boolean;
    isJoined: boolean;
    participants: Participant[];
    reactions: Reaction[];
    messages: ChatMessage[];
    isCallActive: boolean;
    isMuted: boolean;
    error: string | null;
}

const initialState: SessionState = {
    roomCode: null,
    isHost: false,
    isJoined: false,
    participants: [],
    reactions: [],
    messages: [],
    isCallActive: false,
    isMuted: false,
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
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.messages.push(action.payload);
            // Lock in-memory buffer to latest 100 ephemeral messages
            if (state.messages.length > 100) {
                state.messages.shift();
            }
        },
        clearMessages: (state) => {
            state.messages = [];
        },
        setIsCallActive: (state, action: PayloadAction<boolean>) => {
            state.isCallActive = action.payload;
        },
        setIsMuted: (state, action: PayloadAction<boolean>) => {
            state.isMuted = action.payload;
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
    addMessage,
    clearMessages,
    setIsCallActive,
    setIsMuted,
    setSessionError,
} = sessionSlice.actions;

export default sessionSlice.reducer;
