import { describe, it, expect, beforeEach } from 'vitest';
import sessionReducer, {
    startSession,
    joinSession,
    setPartyDetails,
    setPublicParties,
    addOrUpdatePublicParty,
    removePublicParty,
    setSelectedCategoryFilter,
    setChatMutedByHost,
    removeParticipant,
    PublicParty
} from '../sessionSlice';

describe('Sprint 4.2 Public Listening Parties & Discovery Redux Tests', () => {
    let initialState: any;

    beforeEach(() => {
        initialState = {
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
    });

    it('should start session with complete party metadata (description, category, public flag)', () => {
        const state = sessionReducer(initialState, startSession({
            roomCode: 'PARTY1',
            partyName: 'Chillout Lounge',
            description: 'Relaxing ambient music with friends',
            category: 'Lo-Fi',
            isPublic: true
        }));

        expect(state.roomCode).toBe('PARTY1');
        expect(state.partyName).toBe('Chillout Lounge');
        expect(state.partyDescription).toBe('Relaxing ambient music with friends');
        expect(state.partyCategory).toBe('Lo-Fi');
        expect(state.isPublic).toBe(true);
        expect(state.isHost).toBe(true);
    });

    it('should update party discovery list when parties are broadcast or fetched', () => {
        const sampleParties: PublicParty[] = [
            {
                roomCode: 'P1',
                partyName: 'Rock Night',
                category: 'Rock',
                hostName: 'Alice',
                participantCount: 5,
                isPublic: true,
                updatedAt: Date.now()
            },
            {
                roomCode: 'P2',
                partyName: 'Lo-Fi Beats',
                category: 'Lo-Fi',
                hostName: 'Bob',
                participantCount: 12,
                isPublic: true,
                updatedAt: Date.now()
            }
        ];

        let state = sessionReducer(initialState, setPublicParties(sampleParties));
        expect(state.publicParties.length).toBe(2);

        // Update single party (e.g. participant count changes from 12 -> 13)
        state = sessionReducer(state, addOrUpdatePublicParty({
            roomCode: 'P2',
            partyName: 'Lo-Fi Beats',
            category: 'Lo-Fi',
            hostName: 'Bob',
            participantCount: 13,
            isPublic: true,
            updatedAt: Date.now()
        }));

        expect(state.publicParties.find(p => p.roomCode === 'P2')?.participantCount).toBe(13);

        // Remove party when ended
        state = sessionReducer(state, removePublicParty('P1'));
        expect(state.publicParties.length).toBe(1);
        expect(state.publicParties[0].roomCode).toBe('P2');
    });

    it('should filter parties deterministically by category', () => {
        const sampleParties: PublicParty[] = [
            { roomCode: 'P1', partyName: 'Rock 1', category: 'Rock', hostName: 'A', participantCount: 10, isPublic: true, updatedAt: 100 },
            { roomCode: 'P2', partyName: 'Lo-Fi 1', category: 'Lo-Fi', hostName: 'B', participantCount: 20, isPublic: true, updatedAt: 200 },
            { roomCode: 'P3', partyName: 'Pop 1', category: 'Pop', hostName: 'C', participantCount: 5, isPublic: true, updatedAt: 150 },
        ];

        const filterByCategory = (parties: PublicParty[], category: string) => {
            if (category === 'All' || category === 'Trending') return parties;
            return parties.filter(p => p.category === category);
        };

        const loFiFiltered = filterByCategory(sampleParties, 'Lo-Fi');
        expect(loFiFiltered.length).toBe(1);
        expect(loFiFiltered[0].roomCode).toBe('P2');

        const allFiltered = filterByCategory(sampleParties, 'All');
        expect(allFiltered.length).toBe(3);
    });

    it('should toggle chat muting moderation state', () => {
        let state = sessionReducer(initialState, setChatMutedByHost(true));
        expect(state.isChatMutedByHost).toBe(true);

        state = sessionReducer(state, setChatMutedByHost(false));
        expect(state.isChatMutedByHost).toBe(false);
    });

    it('should support kicking participants from the roster', () => {
        let state = {
            ...initialState,
            participants: [
                { id: 'user_1', name: 'Host', isHost: true },
                { id: 'user_2', name: 'Spammer', isHost: false },
            ]
        };

        state = sessionReducer(state, removeParticipant('user_2'));
        expect(state.participants.length).toBe(1);
        expect(state.participants[0].id).toBe('user_1');
    });
});
