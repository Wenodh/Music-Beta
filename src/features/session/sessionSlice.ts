import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Participant {
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
    role?: 'host' | 'co-host' | 'listener' | 'moderator';
    joinedAt?: string;
    isMutedByHost?: boolean;
}

export type PartyCategory = 'Trending' | 'Active Now' | 'Starting Soon' | 'Friends Hosting' | 'Lo-Fi' | 'Rock' | 'Pop' | 'Hip-Hop' | 'Classical' | 'Electronic';

export interface PublicParty {
    roomCode: string;
    partyName: string;
    description?: string;
    category?: PartyCategory | string;
    hostId?: string;
    hostName: string;
    hostAvatar?: string;
    songTitle?: string;
    songArtist?: string;
    songArtwork?: string;
    participantCount: number;
    maxParticipants?: number;
    isPublic: boolean;
    scheduledStart?: string | null;
    status?: 'scheduled' | 'active' | 'paused' | 'ended' | 'cancelled' | 'expired';
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

export interface PartyReport {
    partyId?: string;
    roomCode: string;
    targetUserId?: string;
    reason: string;
    details?: string;
}

interface SessionState {
    roomCode: string | null;
    partyName: string;
    partyDescription: string;
    partyCategory: string;
    isPublic: boolean;
    isHost: boolean;
    hostId: string | null;
    coHostIds: string[];
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
    stateVersion: number;
    hostGracePeriodActive: boolean;
    graceSecondsRemaining: number;
    tempRateMultiplier: number;
    isSongUnavailable: boolean;
    unavailableSongName: string | null;
    selectedCategoryFilter: string;
    isChatMutedByHost: boolean;
}

const initialState: SessionState = {
    roomCode: null,
    partyName: 'Listening Party',
    partyDescription: '',
    partyCategory: 'Trending',
    isPublic: true,
    isHost: false,
    hostId: null,
    coHostIds: [],
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
    stateVersion: 0,
    hostGracePeriodActive: false,
    graceSecondsRemaining: 30,
    tempRateMultiplier: 1.0,
    isSongUnavailable: false,
    unavailableSongName: null,
    selectedCategoryFilter: 'All',
    isChatMutedByHost: false,
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        startSession: (state, action: PayloadAction<{ roomCode: string; partyName?: string; description?: string; category?: string; isPublic?: boolean } | string>) => {
            if (typeof action.payload === 'string') {
                state.roomCode = action.payload;
                state.partyName = 'Listening Party';
                state.partyDescription = '';
                state.partyCategory = 'Trending';
                state.isPublic = true;
            } else {
                state.roomCode = action.payload.roomCode;
                state.partyName = action.payload.partyName || 'Listening Party';
                state.partyDescription = action.payload.description || '';
                state.partyCategory = action.payload.category || 'Trending';
                state.isPublic = action.payload.isPublic ?? true;
            }
            state.isHost = true;
            state.isJoined = true;
            state.error = null;
            state.connectionStatus = 'connected';
            state.stateVersion = 1;
            state.hostGracePeriodActive = false;
            state.graceSecondsRemaining = 30;
            state.tempRateMultiplier = 1.0;
            state.isSongUnavailable = false;
            state.unavailableSongName = null;
            state.isChatMutedByHost = false;
        },
        joinSession: (state, action: PayloadAction<{ roomCode: string; partyName?: string; category?: string } | string>) => {
            if (typeof action.payload === 'string') {
                state.roomCode = action.payload;
            } else {
                state.roomCode = action.payload.roomCode;
                if (action.payload.partyName) state.partyName = action.payload.partyName;
                if (action.payload.category) state.partyCategory = action.payload.category;
            }
            state.isHost = false;
            state.isJoined = true;
            state.error = null;
            state.connectionStatus = 'connecting';
            state.stateVersion = 0;
            state.hostGracePeriodActive = false;
            state.graceSecondsRemaining = 30;
            state.tempRateMultiplier = 1.0;
            state.isSongUnavailable = false;
            state.unavailableSongName = null;
            state.isChatMutedByHost = false;
        },
        leaveSession: (state) => {
            state.roomCode = null;
            state.partyName = 'Listening Party';
            state.partyDescription = '';
            state.partyCategory = 'Trending';
            state.isPublic = true;
            state.isHost = false;
            state.hostId = null;
            state.coHostIds = [];
            state.isJoined = false;
            state.participants = [];
            state.reactions = [];
            state.error = null;
            state.connectionStatus = 'disconnected';
            state.stateVersion = 0;
            state.hostGracePeriodActive = false;
            state.graceSecondsRemaining = 30;
            state.tempRateMultiplier = 1.0;
            state.isSongUnavailable = false;
            state.unavailableSongName = null;
            state.isChatMutedByHost = false;
        },
        setHostId: (state, action: PayloadAction<string | null>) => {
            state.hostId = action.payload;
        },
        setCoHostIds: (state, action: PayloadAction<string[]>) => {
            state.coHostIds = action.payload;
        },
        promoteToHost: (state) => {
            state.isHost = true;
            state.hostGracePeriodActive = false;
            state.stateVersion += 1;
        },
        setPartyDetails: (state, action: PayloadAction<{ partyName?: string; description?: string; category?: string; isPublic?: boolean }>) => {
            if (action.payload.partyName !== undefined) state.partyName = action.payload.partyName;
            if (action.payload.description !== undefined) state.partyDescription = action.payload.description;
            if (action.payload.category !== undefined) state.partyCategory = action.payload.category;
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
        setSelectedCategoryFilter: (state, action: PayloadAction<string>) => {
            state.selectedCategoryFilter = action.payload;
        },
        setChatMutedByHost: (state, action: PayloadAction<boolean>) => {
            state.isChatMutedByHost = action.payload;
        },
        setConnectionStatus: (state, action: PayloadAction<'connected' | 'connecting' | 'disconnected'>) => {
            state.connectionStatus = action.payload;
        },
        setIsSyncing: (state, action: PayloadAction<boolean>) => {
            state.isSyncing = action.payload;
        },
        setStateVersion: (state, action: PayloadAction<number>) => {
            state.stateVersion = action.payload;
        },
        incrementStateVersion: (state) => {
            state.stateVersion += 1;
        },
        setParticipants: (state, action: PayloadAction<Participant[]>) => {
            state.participants = action.payload;
        },
        removeParticipant: (state, action: PayloadAction<string>) => {
            state.participants = state.participants.filter(p => p.id !== action.payload);
        },
        setHostGracePeriod: (state, action: PayloadAction<{ active: boolean; remaining?: number }>) => {
            state.hostGracePeriodActive = action.payload.active;
            if (action.payload.remaining !== undefined) {
                state.graceSecondsRemaining = action.payload.remaining;
            }
        },
        setGraceSecondsRemaining: (state, action: PayloadAction<number>) => {
            state.graceSecondsRemaining = action.payload;
        },
        setTempRateMultiplier: (state, action: PayloadAction<number>) => {
            state.tempRateMultiplier = action.payload;
        },
        setSongUnavailable: (state, action: PayloadAction<{ unavailable: boolean; songName?: string | null }>) => {
            state.isSongUnavailable = action.payload.unavailable;
            state.unavailableSongName = action.payload.songName || null;
        },
        addReaction: (state, action: PayloadAction<Reaction>) => {
            state.reactions.push(action.payload);
        },
        removeReaction: (state, action: PayloadAction<string>) => {
            state.reactions = state.reactions.filter(r => r.id !== action.payload);
        },
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.messages.push(action.payload);
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
    setHostId,
    setCoHostIds,
    promoteToHost,
    setPartyDetails,
    setPublicParties,
    addOrUpdatePublicParty,
    removePublicParty,
    setSelectedCategoryFilter,
    setChatMutedByHost,
    setParticipants,
    removeParticipant,
    setHostGracePeriod,
    setGraceSecondsRemaining,
    setTempRateMultiplier,
    setSongUnavailable,
    setStateVersion,
    incrementStateVersion,
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
