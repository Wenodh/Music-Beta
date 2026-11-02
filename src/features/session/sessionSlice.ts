import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Participant {
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
}

export interface PublicParty {
    roomCode: string;
    partyName: string;
    hostName: string;
    hostAvatar?: string;
    songTitle?: string;
    songArtist?: string;
    songArtwork?: string;
    participantCount: number;
    isPublic: boolean;
    updatedAt: number;
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
    partyName: string;
    isPublic: boolean;
    isHost: boolean;
    isJoined: boolean;
    participants: Participant[];
    reactions: Reaction[];
    messages: ChatMessage[];
    isCallActive: boolean;
    isMuted: boolean;
    error: string | null;
    publicParties: PublicParty[];
    isSyncing: boolean;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

const initialState: SessionState = {
    roomCode: null,
    partyName: 'Listening Party',
    isPublic: true,
    isHost: false,
    isJoined: false,
    participants: [],
    reactions: [],
    messages: [],
    isCallActive: false,
    isMuted: false,
    error: null,
    publicParties: [],
    isSyncing: false,
    connectionStatus: 'disconnected',
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        startSession: (state, action: PayloadAction<{ roomCode: string; partyName?: string; isPublic?: boolean } | string>) => {
            if (typeof action.payload === 'string') {
                state.roomCode = action.payload;
                state.partyName = 'Listening Party';
                state.isPublic = true;
            } else {
                state.roomCode = action.payload.roomCode;
                state.partyName = action.payload.partyName || 'Listening Party';
                state.isPublic = action.payload.isPublic ?? true;
            }
            state.isHost = true;
            state.isJoined = true;
            state.error = null;
            state.connectionStatus = 'connected';
        },
        joinSession: (state, action: PayloadAction<{ roomCode: string; partyName?: string } | string>) => {
            if (typeof action.payload === 'string') {
                state.roomCode = action.payload;
            } else {
                state.roomCode = action.payload.roomCode;
                if (action.payload.partyName) state.partyName = action.payload.partyName;
            }
            state.isHost = false;
            state.isJoined = true;
            state.error = null;
            state.connectionStatus = 'connecting';
        },
        leaveSession: (state) => {
            state.roomCode = null;
            state.partyName = 'Listening Party';
            state.isPublic = true;
            state.isHost = false;
            state.isJoined = false;
            state.participants = [];
            state.reactions = [];
            state.error = null;
            state.connectionStatus = 'disconnected';
        },
        setPartyDetails: (state, action: PayloadAction<{ partyName?: string; isPublic?: boolean }>) => {
            if (action.payload.partyName !== undefined) state.partyName = action.payload.partyName;
            if (action.payload.isPublic !== undefined) state.isPublic = action.payload.isPublic;
        },
        setPublicParties: (state, action: PayloadAction<PublicParty[]>) => {
            state.publicParties = action.payload;
        },
        addOrUpdatePublicParty: (state, action: PayloadAction<PublicParty>) => {
            const idx = state.publicParties.findIndex(p => p.roomCode === action.payload.roomCode);
            if (idx !== -1) {
                state.publicParties[idx] = action.payload;
            } else {
                state.publicParties.unshift(action.payload);
            }
        },
        removePublicParty: (state, action: PayloadAction<string>) => {
            state.publicParties = state.publicParties.filter(p => p.roomCode !== action.payload);
        },
        setConnectionStatus: (state, action: PayloadAction<'connected' | 'connecting' | 'disconnected'>) => {
            state.connectionStatus = action.payload;
        },
        setIsSyncing: (state, action: PayloadAction<boolean>) => {
            state.isSyncing = action.payload;
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
    setPartyDetails,
    setPublicParties,
    addOrUpdatePublicParty,
    removePublicParty,
    setParticipants,
    addReaction,
    removeReaction,
    addMessage,
    clearMessages,
    setIsCallActive,
    setIsMuted,
    setConnectionStatus,
    setIsSyncing,
    setSessionError,
} = sessionSlice.actions;

export default sessionSlice.reducer;
