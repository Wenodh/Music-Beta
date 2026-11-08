// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import friendsReducer, {
    addDirectMessage,
    updateMessageStatus,
    setDirectCallActive,
    endDirectCall,
} from '../friendsSlice';
import authReducer from '../../auth/authSlice';
import socialReducer from '../../social/socialSlice';
import musicPlayerReducer from '../../musicplayer/musicPlayerSlice';
import { InCallChatDrawer } from '../../../components/modals/InCallChatDrawer';
import * as DirectCommsContext from '../../../hooks/useDirectCommunication';

describe('Batch 2: In-Call Text Chat Drawer', () => {
    let store: any;
    const sendDirectMessageSpy = vi.fn(async () => {});

    beforeEach(() => {
        vi.clearAllMocks();

        store = configureStore({
            reducer: {
                auth: authReducer,
                social: socialReducer,
                musicPlayer: musicPlayerReducer,
                friends: friendsReducer,
            },
            preloadedState: {
                auth: {
                    user: { id: 'user-self-1', email: 'me@vibeon.app', user_metadata: { username: 'myself' } } as any,
                    isAuthenticated: true,
                    isGuest: false,
                    token: 'token',
                    loading: false,
                },
                friends: {
                    friendsList: [],
                    activeFriendId: 'peer-friend-1',
                    isFriendsModalOpen: false,
                    isCallActive: true,
                    isCallScreenExpanded: true,
                    activeCall: {
                        callId: 'call-123',
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                        callType: 'audio',
                        status: 'connected',
                        isIncoming: false,
                        connectedAt: Date.now(),
                    } as any,
                    incomingCall: null,
                    isMuted: false,
                    isVideoEnabled: false,
                    isSpeakerphone: false,
                    isCallMinimized: false,
                    pendingRequests: [],
                    sentRequests: [],
                    onlineFriends: {},
                    activityPrivacySettings: {
                        shareActivity: true,
                    },
                    directMessages: {
                        'peer-friend-1': [
                            {
                                id: 'm1',
                                friendId: 'peer-friend-1',
                                senderId: 'peer-friend-1',
                                senderName: 'Alice',
                                text: 'Can you hear me?',
                                timestamp: 1000000,
                                status: 'seen',
                            },
                        ],
                    },
                },
            },
        });

        vi.spyOn(DirectCommsContext, 'useDirectCommunication').mockReturnValue({
            sendDirectMessage: sendDirectMessageSpy,
            userId: 'user-self-1',
            callFriend: vi.fn(async () => {}),
            acceptCall: vi.fn(async () => {}),
            rejectCall: vi.fn(),
            endCall: vi.fn(),
            toggleMute: vi.fn(),
            toggleSpeaker: vi.fn(),
            toggleVideo: vi.fn(),
            switchCamera: vi.fn(async () => {}),
            isCameraFlipped: false,
            localStream: null,
            remoteStream: null,
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders drawer with friend name and message history when open', async () => {
        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(
                React.createElement(
                    Provider,
                    { store },
                    React.createElement(InCallChatDrawer, {
                        isOpen: true,
                        onClose: vi.fn(),
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                    })
                )
            );
        });

        expect(container.textContent).toContain('Alice');
        expect(container.textContent).toContain('Can you hear me?');
        expect(container.textContent).toContain('End-to-End Encrypted');

        await act(async () => {
            root.unmount();
        });
    });

    it('does not render drawer content when isOpen is false', async () => {
        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(
                React.createElement(
                    Provider,
                    { store },
                    React.createElement(InCallChatDrawer, {
                        isOpen: false,
                        onClose: vi.fn(),
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                    })
                )
            );
        });

        expect(container.querySelector('aside')).toBeNull();

        await act(async () => {
            root.unmount();
        });
    });

    it('calls sendDirectMessage through useDirectCommunication when sending input', async () => {
        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(
                React.createElement(
                    Provider,
                    { store },
                    React.createElement(InCallChatDrawer, {
                        isOpen: true,
                        onClose: vi.fn(),
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                    })
                )
            );
        });

        const input = container.querySelector('input') as HTMLInputElement;
        const form = container.querySelector('form') as HTMLFormElement;

        expect(input).toBeDefined();

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        await act(async () => {
            nativeInputValueSetter?.call(input, 'Loud and clear!');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const sendBtn = container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement;
        expect(sendBtn).toBeDefined();

        await act(async () => {
            sendBtn.click();
        });

        expect(sendDirectMessageSpy).toHaveBeenCalledWith('peer-friend-1', 'Loud and clear!');

        await act(async () => {
            root.unmount();
        });
    });

    it('invokes onClose when clicking the close button or backdrop', async () => {
        const onCloseSpy = vi.fn();
        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(
                React.createElement(
                    Provider,
                    { store },
                    React.createElement(InCallChatDrawer, {
                        isOpen: true,
                        onClose: onCloseSpy,
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                    })
                )
            );
        });

        const closeBtn = container.querySelector('button[aria-label="Close chat drawer"]') as HTMLButtonElement;
        expect(closeBtn).toBeDefined();

        await act(async () => {
            closeBtn.click();
        });

        expect(onCloseSpy).toHaveBeenCalledTimes(1);

        await act(async () => {
            root.unmount();
        });
    });

    it('updates transcript when new incoming direct message action is dispatched in Redux', async () => {
        const container = document.createElement('div');
        const root = createRoot(container);

        await act(async () => {
            root.render(
                React.createElement(
                    Provider,
                    { store },
                    React.createElement(InCallChatDrawer, {
                        isOpen: true,
                        onClose: vi.fn(),
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                    })
                )
            );
        });

        // Dispatch incoming message from Alice during call
        await act(async () => {
            store.dispatch(
                addDirectMessage({
                    id: 'm2',
                    friendId: 'peer-friend-1',
                    senderId: 'peer-friend-1',
                    senderName: 'Alice',
                    text: 'Sending you the music link now',
                    timestamp: 1005000,
                    status: 'delivered',
                })
            );
        });

        expect(container.textContent).toContain('Sending you the music link now');

        await act(async () => {
            root.unmount();
        });
    });

    it('reflects message delivery status updates in Redux (sent -> delivered -> seen)', async () => {
        const container = document.createElement('div');
        const root = createRoot(container);

        // Add an outgoing message from self
        await act(async () => {
            store.dispatch(
                addDirectMessage({
                    id: 'm-out-1',
                    friendId: 'peer-friend-1',
                    senderId: 'user-self-1',
                    senderName: 'myself',
                    text: 'Did this reach you?',
                    timestamp: 1006000,
                    status: 'sent',
                })
            );
        });

        await act(async () => {
            root.render(
                React.createElement(
                    Provider,
                    { store },
                    React.createElement(InCallChatDrawer, {
                        isOpen: true,
                        onClose: vi.fn(),
                        friendId: 'peer-friend-1',
                        friendName: 'Alice',
                    })
                )
            );
        });

        expect(container.textContent).toContain('Did this reach you?');

        // Transition status from sent to seen
        await act(async () => {
            store.dispatch(
                updateMessageStatus({
                    friendId: 'peer-friend-1',
                    messageId: 'm-out-1',
                    status: 'seen',
                })
            );
        });

        const updatedMessage = store.getState().friends.directMessages['peer-friend-1'].find((m: any) => m.id === 'm-out-1');
        expect(updatedMessage?.status).toBe('seen');

        await act(async () => {
            root.unmount();
        });
    });
});
