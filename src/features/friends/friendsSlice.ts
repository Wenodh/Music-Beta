import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Friend, DirectMessage, MessageStatus } from '../../utils/friendsDb';
import { CallType, CallStatus, ActiveCallState } from '../../types/call';

export interface IncomingCallInfo {
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    channelName: string;
    callType: CallType;
}

export interface StartCallPayload {
    friendId: string;
    friendName: string;
    friendAvatar?: string;
    callType: CallType;
    isIncoming: boolean;
}

interface FriendsState {
    friendsList: Friend[];
    activeFriendId: string | null;
    directMessages: Record<string, DirectMessage[]>;
    incomingCall: IncomingCallInfo | null;
    isCallActive: boolean;
    activeCallFriend: Friend | null;
    activeCall: ActiveCallState | null;
    isCallScreenExpanded: boolean;
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
    activeCall: null,
    isCallScreenExpanded: true,
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
            if (!state.friendsList.some((f) => f.id === action.payload.id)) {
                state.friendsList.push(action.payload);
            }
        },
        removeFriend: (state, action: PayloadAction<string>) => {
            state.friendsList = state.friendsList.filter((f) => f.id !== action.payload);
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
            const existingIdx = state.directMessages[fid].findIndex((m) => m.id === action.payload.id);
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
                const msg = msgs.find((m) => m.id === messageId);
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
        startDirectCall: (state, action: PayloadAction<StartCallPayload | Friend>) => {
            const isPayloadObj = 'callType' in action.payload;
            const friendId = isPayloadObj ? action.payload.friendId : action.payload.id;
            const friendName = isPayloadObj ? action.payload.friendName : action.payload.name;
            const friendAvatar = isPayloadObj ? action.payload.friendAvatar : undefined;
            const callType = isPayloadObj ? action.payload.callType : 'audio';
            const isIncoming = isPayloadObj ? action.payload.isIncoming : false;

            state.isCallActive = true;
            state.isCallScreenExpanded = true;
            state.activeCallFriend = { id: friendId, name: friendName, addedAt: Date.now() };
            state.activeCall = {
                friendId,
                friendName,
                friendAvatar,
                callType,
                status: isIncoming ? 'connecting' : 'ringing',
                isIncoming,
                startedAt: Date.now(),
                connectedAt: null,
                isMuted: false,
                isVideoEnabled: callType === 'video',
                isSpeakerOn: false,
                facingMode: 'user',
            };
            state.incomingCall = null;
            state.isMuted = false;
        },
        updateCallStatus: (state, action: PayloadAction<CallStatus>) => {
            if (state.activeCall) {
                state.activeCall.status = action.payload;
                if (action.payload === 'connected' && !state.activeCall.connectedAt) {
                    state.activeCall.connectedAt = Date.now();
                }
            }
        },
        setCallMuted: (state, action: PayloadAction<boolean>) => {
            state.isMuted = action.payload;
            if (state.activeCall) {
                state.activeCall.isMuted = action.payload;
            }
        },
        toggleDirectMute: (state) => {
            state.isMuted = !state.isMuted;
            if (state.activeCall) {
                state.activeCall.isMuted = state.isMuted;
            }
        },
        setCallVideoEnabled: (state, action: PayloadAction<boolean>) => {
            if (state.activeCall) {
                state.activeCall.isVideoEnabled = action.payload;
            }
        },
        setCallSpeakerOn: (state, action: PayloadAction<boolean>) => {
            if (state.activeCall) {
                state.activeCall.isSpeakerOn = action.payload;
            }
        },
        setCallFacingMode: (state, action: PayloadAction<'user' | 'environment'>) => {
            if (state.activeCall) {
                state.activeCall.facingMode = action.payload;
            }
        },
        setIsCallScreenExpanded: (state, action: PayloadAction<boolean>) => {
            state.isCallScreenExpanded = action.payload;
        },
        endDirectCall: (state) => {
            state.isCallActive = false;
            state.activeCallFriend = null;
            state.activeCall = null;
            state.incomingCall = null;
            state.isMuted = false;
            state.isCallScreenExpanded = false;
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
    updateCallStatus,
    setCallMuted,
    toggleDirectMute,
    setCallVideoEnabled,
    setCallSpeakerOn,
    setCallFacingMode,
    setIsCallScreenExpanded,
    endDirectCall,
    setIsFriendsModalOpen,
} = friendsSlice.actions;

export default friendsSlice.reducer;
