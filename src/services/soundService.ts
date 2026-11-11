/**
 * Centralized Sound Management Service
 *
 * Provides audio playback for:
 * - Incoming voice/video calls (continuous loop)
 * - Incoming direct messages (short tone, throttled/deduplicated)
 * - Group/session invitations (short tone)
 * - Sound previews in Settings
 *
 * Uses local bundled sound assets in `/sounds/` with Web Audio API synthesis fallback.
 */

export interface SoundOption {
    id: string;
    name: string;
    file: string;
    category: 'ringtone' | 'message' | 'invitation';
}

export const AVAILABLE_RINGTONES: SoundOption[] = [
    { id: 'ringtone_modern', name: 'Vibe Modern (Default)', file: '/sounds/ringtone_modern.wav', category: 'ringtone' },
    { id: 'ringtone_cyber', name: 'Cyber Pulse', file: '/sounds/ringtone_cyber.wav', category: 'ringtone' },
    { id: 'ringtone_bell', name: 'Harmonic Bell', file: '/sounds/ringtone_bell.wav', category: 'ringtone' },
    { id: 'ringtone_cosmic', name: 'Cosmic Chime', file: '/sounds/ringtone_cosmic.wav', category: 'ringtone' },
];

export const AVAILABLE_MESSAGE_SOUNDS: SoundOption[] = [
    { id: 'msg_pop', name: 'Pop Chime (Default)', file: '/sounds/msg_pop.wav', category: 'message' },
    { id: 'msg_droplet', name: 'Water Droplet', file: '/sounds/msg_droplet.wav', category: 'message' },
    { id: 'msg_ping', name: 'Electronic Ping', file: '/sounds/msg_ping.wav', category: 'message' },
    { id: 'msg_pulse', name: 'Soft Pulse', file: '/sounds/msg_pulse.wav', category: 'message' },
];

export const AVAILABLE_INVITE_SOUNDS: SoundOption[] = [
    { id: 'invite_radiant', name: 'Radiant Fanfare (Default)', file: '/sounds/invite_radiant.wav', category: 'invitation' },
    { id: 'invite_ambient', name: 'Ambient Chime', file: '/sounds/invite_ambient.wav', category: 'invitation' },
];

export interface NotificationSoundPreferences {
    masterEnabled: boolean;
    ringtoneEnabled: boolean;
    messageEnabled: boolean;
    invitationEnabled: boolean;
    voiceCallRingtone: string;
    videoCallRingtone: string;
    messageSound: string;
    invitationSound: string;
}

export const DEFAULT_NOTIFICATION_SOUNDS: NotificationSoundPreferences = {
    masterEnabled: true,
    ringtoneEnabled: true,
    messageEnabled: true,
    invitationEnabled: true,
    voiceCallRingtone: 'ringtone_modern',
    videoCallRingtone: 'ringtone_cyber',
    messageSound: 'msg_pop',
    invitationSound: 'invite_radiant',
};

class SoundService {
    private ringtoneAudio: HTMLAudioElement | null = null;
    private previewAudio: HTMLAudioElement | null = null;
    private currentPreviewId: string | null = null;
    private lastMessageSoundPlayedAt = 0;
    private preferences: NotificationSoundPreferences = { ...DEFAULT_NOTIFICATION_SOUNDS };

    // Outgoing ringback synthesizer state
    private ringbackContext: AudioContext | null = null;
    private ringbackTimer: any = null;
    private isRingbackPlaying = false;

    constructor() {
        this.loadPreferences();
    }

    public getPreferences(): NotificationSoundPreferences {
        return { ...this.preferences };
    }

    public updatePreferences(newPrefs: Partial<NotificationSoundPreferences>): NotificationSoundPreferences {
        this.preferences = { ...this.preferences, ...newPrefs };
        try {
            localStorage.setItem('vibeon_notification_sounds', JSON.stringify(this.preferences));
        } catch {
            // Silently ignore storage errors
        }
        return { ...this.preferences };
    }

    public restoreDefaults(): NotificationSoundPreferences {
        this.preferences = { ...DEFAULT_NOTIFICATION_SOUNDS };
        try {
            localStorage.removeItem('vibeon_notification_sounds');
        } catch {
            // Silently ignore
        }
        return { ...this.preferences };
    }

    private loadPreferences() {
        try {
            const saved = localStorage.getItem('vibeon_notification_sounds');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.preferences = { ...DEFAULT_NOTIFICATION_SOUNDS, ...parsed };
            }
        } catch {
            this.preferences = { ...DEFAULT_NOTIFICATION_SOUNDS };
        }
    }

    private resolveSoundPath(id: string, category: 'ringtone' | 'message' | 'invitation'): string {
        const list =
            category === 'ringtone'
                ? AVAILABLE_RINGTONES
                : category === 'message'
                ? AVAILABLE_MESSAGE_SOUNDS
                : AVAILABLE_INVITE_SOUNDS;
        const found = list.find((item) => item.id === id);
        return found ? found.file : list[0].file;
    }

    /**
     * Start playing continuous incoming call ringtone
     */
    private isRingtonePlaying = false;

    public startIncomingCallRingtone(callType: 'audio' | 'video' = 'audio'): void {
        this.stopPreview();

        if (!this.preferences.masterEnabled || !this.preferences.ringtoneEnabled) {
            return;
        }

        const soundId = callType === 'video'
            ? this.preferences.videoCallRingtone
            : this.preferences.voiceCallRingtone;
        const soundPath = this.resolveSoundPath(soundId, 'ringtone');

        if (this.ringtoneAudio) {
            try {
                this.ringtoneAudio.pause();
                this.ringtoneAudio.currentTime = 0;
            } catch {
                // Handled safely
            }
            this.ringtoneAudio = null;
        }

        this.isRingtonePlaying = true;
        try {
            const audio = new Audio(soundPath);
            audio.loop = true;
            audio.volume = 0.85;
            this.ringtoneAudio = audio;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch((err) => {
                    // If call was stopped while play promise was resolving, ensure silence
                    if (!this.isRingtonePlaying && this.ringtoneAudio === audio) {
                        try {
                            audio.pause();
                            audio.currentTime = 0;
                        } catch {
                            // Ignored: audio element already detached or silenced
                        }
                    }
                    console.warn('[SoundService] Ringtone autoplay blocked or aborted:', err);
                });
            }
        } catch (err) {
            console.warn('[SoundService] Could not play ringtone audio:', err);
        }
    }

    /**
     * Stop incoming call ringtone immediately
     */
    public stopIncomingCallRingtone(): void {
        this.isRingtonePlaying = false;
        if (this.ringtoneAudio) {
            try {
                this.ringtoneAudio.pause();
                this.ringtoneAudio.currentTime = 0;
            } catch {
                // Handled safely
            }
            this.ringtoneAudio = null;
        }
    }

    /**
     * Start playing standard telephone-style rhythmic ringback tone for caller
     * (e.g. 440Hz + 480Hz dual-frequency tone for 1.8s, followed by 2.2s silence).
     */
    public startOutgoingCallRingback(): void {
        this.stopOutgoingCallRingback();

        if (!this.preferences.masterEnabled || !this.preferences.ringtoneEnabled) {
            return;
        }

        this.isRingbackPlaying = true;

        const playChimeCycle = () => {
            if (!this.isRingbackPlaying) return;

            try {
                const AudioCtxClass = typeof window !== 'undefined'
                    ? window.AudioContext || (window as any).webkitAudioContext
                    : null;
                if (!AudioCtxClass) return;

                if (!this.ringbackContext || this.ringbackContext.state === 'closed') {
                    this.ringbackContext = new AudioCtxClass();
                }

                const ctx = this.ringbackContext;
                if (ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                }

                const startTime = ctx.currentTime;
                const duration = 1.6;

                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(440, startTime); // Standard dial tone frequency 1

                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(480, startTime); // Standard dial tone frequency 2

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.05);
                gain.gain.setValueAtTime(0.12, startTime + duration - 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc1.start(startTime);
                osc2.start(startTime);
                osc1.stop(startTime + duration);
                osc2.stop(startTime + duration);
            } catch (err) {
                console.warn('[SoundService] Ringback audio generation error:', err);
            }
        };

        // Play initial burst immediately, then repeat every 4 seconds
        playChimeCycle();
        this.ringbackTimer = setInterval(() => {
            if (this.isRingbackPlaying) {
                playChimeCycle();
            } else {
                this.stopOutgoingCallRingback();
            }
        }, 4000);
    }

    /**
     * Stop outgoing call ringback tone immediately
     */
    public stopOutgoingCallRingback(): void {
        this.isRingbackPlaying = false;
        if (this.ringbackTimer) {
            clearInterval(this.ringbackTimer);
            this.ringbackTimer = null;
        }
        if (this.ringbackContext) {
            try {
                this.ringbackContext.close().catch(() => {});
            } catch {
                // Handled safely
            }
            this.ringbackContext = null;
        }
    }

    /**
     * Play one-shot message notification sound (throttled to avoid rapid burst echo)
     */
    public playMessageSound(): void {
        if (!this.preferences.masterEnabled || !this.preferences.messageEnabled) {
            return;
        }

        // Throttle to at most one chime every 300ms
        const now = Date.now();
        if (now - this.lastMessageSoundPlayedAt < 300) {
            return;
        }
        this.lastMessageSoundPlayedAt = now;

        const soundPath = this.resolveSoundPath(this.preferences.messageSound, 'message');
        try {
            const audio = new Audio(soundPath);
            audio.volume = 0.7;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch((err) => {
                    console.warn('[SoundService] Message sound blocked or interrupted:', err);
                });
            }
        } catch (err) {
            console.warn('[SoundService] Message sound error:', err);
        }
    }

    /**
     * Play one-shot group session / invitation sound
     */
    public playInvitationSound(): void {
        if (!this.preferences.masterEnabled || !this.preferences.invitationEnabled) {
            return;
        }

        const soundPath = this.resolveSoundPath(this.preferences.invitationSound, 'invitation');
        try {
            const audio = new Audio(soundPath);
            audio.volume = 0.75;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch((err) => {
                    console.warn('[SoundService] Invitation sound blocked or interrupted:', err);
                });
            }
        } catch (err) {
            console.warn('[SoundService] Invitation sound error:', err);
        }
    }

    /**
     * Play preview of a sound option in Settings
     */
    public previewSound(soundId: string, category: 'ringtone' | 'message' | 'invitation'): void {
        // Stop any active preview
        this.stopPreview();

        const soundPath = this.resolveSoundPath(soundId, category);
        try {
            const audio = new Audio(soundPath);
            audio.volume = 0.75;
            audio.loop = false;
            this.previewAudio = audio;
            this.currentPreviewId = soundId;

            audio.onended = () => {
                if (this.currentPreviewId === soundId) {
                    this.currentPreviewId = null;
                    this.previewAudio = null;
                }
            };

            const playPromise = audio.play();
            if (playPromise) {
                playPromise.catch((err) => {
                    console.warn('[SoundService] Sound preview failed:', err);
                    this.currentPreviewId = null;
                    this.previewAudio = null;
                });
            }
        } catch (err) {
            console.warn('[SoundService] Preview error:', err);
            this.currentPreviewId = null;
            this.previewAudio = null;
        }
    }

    /**
     * Stop preview playback immediately
     */
    public stopPreview(): void {
        if (this.previewAudio) {
            try {
                this.previewAudio.pause();
                this.previewAudio.currentTime = 0;
            } catch {
                // Handled safely
            }
            this.previewAudio = null;
        }
        this.currentPreviewId = null;
    }

    /**
     * Check which sound is currently previewing
     */
    public getCurrentPreviewId(): string | null {
        return this.currentPreviewId;
    }
}

export const soundService = new SoundService();
