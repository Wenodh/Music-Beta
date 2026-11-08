import { describe, it, expect, vi, beforeEach } from 'vitest';
import { soundService, AVAILABLE_RINGTONES, AVAILABLE_MESSAGE_SOUNDS, AVAILABLE_INVITE_SOUNDS } from '../soundService';

describe('SoundService - Centralized Sound Management', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        (globalThis as any).localStorage = {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, val: string) => { mockStorage[key] = val; },
            removeItem: (key: string) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; },
        };
        (globalThis as any).Audio = class {
            src: string;
            loop = false;
            volume = 1;
            onended: (() => void) | null = null;
            constructor(src: string) {
                this.src = src;
            }
            play() {
                return Promise.resolve();
            }
            pause() {}
        };

        localStorage.clear();
        soundService.restoreDefaults();
        soundService.stopIncomingCallRingtone();
        soundService.stopPreview();
    });

    it('has all bundled ringtone, message, and invitation assets configured', () => {
        expect(AVAILABLE_RINGTONES.length).toBeGreaterThanOrEqual(4);
        expect(AVAILABLE_MESSAGE_SOUNDS.length).toBeGreaterThanOrEqual(4);
        expect(AVAILABLE_INVITE_SOUNDS.length).toBeGreaterThanOrEqual(2);

        expect(AVAILABLE_RINGTONES[0].id).toBe('ringtone_modern');
        expect(AVAILABLE_MESSAGE_SOUNDS[0].id).toBe('msg_pop');
        expect(AVAILABLE_INVITE_SOUNDS[0].id).toBe('invite_radiant');
    });

    it('manages preferences and persists to localStorage', () => {
        const initial = soundService.getPreferences();
        expect(initial.masterEnabled).toBe(true);
        expect(initial.voiceCallRingtone).toBe('ringtone_modern');

        soundService.updatePreferences({ voiceCallRingtone: 'ringtone_cyber', masterEnabled: false });
        const updated = soundService.getPreferences();
        expect(updated.voiceCallRingtone).toBe('ringtone_cyber');
        expect(updated.masterEnabled).toBe(false);

        // Verify localStorage persistence
        const raw = localStorage.getItem('vibeon_notification_sounds');
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw!).voiceCallRingtone).toBe('ringtone_cyber');

        // Restore defaults
        const restored = soundService.restoreDefaults();
        expect(restored.voiceCallRingtone).toBe('ringtone_modern');
        expect(restored.masterEnabled).toBe(true);
    });

    it('safely handles play, loop, preview, and stop without crashing in headless environment', () => {
        // start incoming call ringtone
        expect(() => soundService.startIncomingCallRingtone('audio')).not.toThrow();
        expect(() => soundService.startIncomingCallRingtone('video')).not.toThrow();
        expect(() => soundService.stopIncomingCallRingtone()).not.toThrow();

        // play message sound
        expect(() => soundService.playMessageSound()).not.toThrow();

        // play invitation sound
        expect(() => soundService.playInvitationSound()).not.toThrow();

        // preview and stop
        expect(() => soundService.previewSound('ringtone_bell', 'ringtone')).not.toThrow();
        expect(soundService.getCurrentPreviewId()).toBe('ringtone_bell');
        expect(() => soundService.stopPreview()).not.toThrow();
        expect(soundService.getCurrentPreviewId()).toBeNull();
    });
});
