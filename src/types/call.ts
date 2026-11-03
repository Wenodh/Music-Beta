export type CallType = 'audio' | 'video';

export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'reconnecting' | 'ended';

export interface ActiveCallState {
    callId: string;
    friendId: string;
    friendName: string;
    friendAvatar?: string;
    callType: CallType;
    status: CallStatus;
    isIncoming: boolean;
    startedAt: number | null;
    connectedAt: number | null;
    isMuted: boolean;
    isVideoEnabled: boolean;
    isRemoteVideoEnabled: boolean;
    isSpeakerOn: boolean;
    facingMode: 'user' | 'environment';
}
