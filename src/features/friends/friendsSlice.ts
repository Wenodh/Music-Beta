import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Friend, DirectMessage, MessageStatus } from '../../utils/friendsDb';

export interface IncomingCallInfo {
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    channelName: string;
}

interface FriendsState {
    friendsList: Friend[];
    activeFriendId: string | null;
    directMessages: Record<string, DirectMessage[]>;
    incomingCall: IncomingCallInfo | null;
    isCallActive: boolean;
    activeCallFriend: Friend | null;
    isMuted: boolean;
    isFriendsModalOpen: boolean;
}

const initialState: FriendsState = {
    friendsList: [],
    activeFriendId: null,
    directMessages: {},
    incomingCall: null,
    isCallActive: false,
    activeCallFriend: null,
    isMuted: false,
    isFriendsModalOpen: false,
};

const friendsSlice = createSlice({
    name: 'friends',
    initialState,
    reducers: {
        setFriendsList: (state, action: PayloadAction<Friend[]>) => {
            state.friendsList = action.payload;
        },
        addFriend: (state, action: PayloadAction<Friend>) => {
            if (!state.friendsList.some(f => f.id === action.payload.id)) {
                state.friendsList.push(action.payload);
            }
        },
        removeFriend: (state, action: PayloadAction<string>) => {
            state.friendsList = state.friendsList.filter(f => f.id !== action.payload);
            if (state.activeFriendId === action.payload) {
                state.activeFriendId = null;
            }
        },
        setActiveFriendId: (state, action: PayloadAction<string | null>) => {
            state.activeFriendId = action.payload;
        },
        setDirectMessages: (state, action: PayloadAction<{ friendId: string; messages: DirectMessage[] }>) => {
            state.directMessages[action.payload.friendId] = action.payload.messages;
        },
        addDirectMessage: (state, action: PayloadAction<DirectMessage>) => {
            const fid = action.payload.friendId;
            if (!state.directMessages[fid]) {
                state.directMessages[fid] = [];
            }
            const existingIdx = state.directMessages[fid].findIndex(m => m.id === action.payload.id);
            if (existingIdx !== -1) {
                state.directMessages[fid][existingIdx] = action.payload;
            } else {
                state.directMessages[fid].push(action.payload);
            }
        },
        updateMessageStatus: (state, action: PayloadAction<{ friendId: string; messageId: string; status: MessageStatus }>) => {
            const { friendId, messageId, status } = action.payload;
            const msgs = state.directMessages[friendId];
            if (msgs) {
                const msg = msgs.find(m => m.id === messageId);
                if (msg) {
                    msg.status = status;
                }
            }
        },
        markFriendMessagesSeen: (state, action: PayloadAction<{ friendId: string; senderId?: string }>) => {
            const { friendId, senderId } = action.payload;
            const msgs = state.directMessages[friendId];
            if (msgs) {
                for (const m of msgs) {
                    if (!senderId || m.senderId === senderId) {
                        m.status = 'seen';
                    }
                }
            }
        },
        setIncomingCall: (state, action: PayloadAction<IncomingCallInfo | null>) => {
            state.incomingCall = action.payload;
        },
        startDirectCall: (state, action: PayloadAction<Friend>) => {
            state.isCallActive = true;
            state.activeCallFriend = action.payload;
            state.incomingCall = null;
            state.isMuted = false;
        },
        endDirectCall: (state) => {
            state.isCallActive = false;
            state.activeCallFriend = null;
            state.incomingCall = null;
            state.isMuted = false;
        },
        toggleDirectMute: (state) => {
            state.isMuted = !state.isMuted;
        },
        setIsFriendsModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isFriendsModalOpen = action.payload;
        },
    },
});

export const {
    setFriendsList,
    addFriend,
    removeFriend,
    setActiveFriendId,
    setDirectMessages,
    addDirectMessage,
    updateMessageStatus,
    markFriendMessagesSeen,
    setIncomingCall,
    startDirectCall,
    endDirectCall,
    toggleDirectMute,
    setIsFriendsModalOpen,
} = friendsSlice.actions;

export default friendsSlice.reducer;
