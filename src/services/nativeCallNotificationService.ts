import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

interface VibeOnMediaPluginInterface {
    requestAudioFocus(): Promise<{ granted: boolean }>;
    startCallForegroundService(options: { friendName: string; callType: string }): Promise<void>;
    stopCallForegroundService(): Promise<void>;
    abandonAudioFocus(): Promise<void>;
    setSpeakerphoneOn(options: { enabled: boolean }): Promise<void>;
    showCallNotification(options: {
        friendName: string;
        callType: string;
        isMuted: boolean;
        duration: string;
    }): Promise<void>;
    clearCallNotification(): Promise<void>;
    showIncomingCallNotification(options: { callerName: string; callType: string }): Promise<void>;
    clearIncomingCallNotification(): Promise<void>;
    addListener(
        eventName: 'callNotificationAction',
        listenerFunc: (data: { action: 'toggleMute' | 'endCall' | 'acceptCall' | 'declineCall' }) => void
    ): Promise<PluginListenerHandle>;
    addListener(
        eventName: 'audioFocusChanged',
        listenerFunc: (data: { event: string }) => void
    ): Promise<PluginListenerHandle>;
    addListener(
        eventName: 'becomingNoisy',
        listenerFunc: (data: { event: string }) => void
    ): Promise<PluginListenerHandle>;
}

const VibeOnMedia = registerPlugin<VibeOnMediaPluginInterface>('VibeOnMedia');

class NativeCallNotificationService {
    private listenerHandle: PluginListenerHandle | null = null;
    private lifecycleListenerHandles: PluginListenerHandle[] = [];
    private isNative = false;

    constructor() {
        this.checkIsNative();
    }

    private checkIsNative() {
        if (typeof window !== 'undefined') {
            const cap = (window as any).Capacitor;
            this.isNative = Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
        }
    }

    public async startForegroundCall(options: { friendName: string; callType: string }): Promise<void> {
        if (!this.isNative) return;
        try {
            await VibeOnMedia.startCallForegroundService(options);
        } catch (error) {
            console.warn('[NativeCallNotification] Foreground call service could not start:', error);
        }
    }

    public async stopForegroundCall(): Promise<void> {
        if (!this.isNative) return;
        try {
            await VibeOnMedia.stopCallForegroundService();
        } catch (error) {
            console.warn('[NativeCallNotification] Foreground call service could not stop:', error);
        }
    }

    public async requestAudioFocus(): Promise<boolean> {
        if (!this.isNative) return true;
        try {
            const result = await VibeOnMedia.requestAudioFocus();
            return Boolean(result?.granted);
        } catch (error) {
            console.warn('[NativeCallNotification] Audio focus request failed:', error);
            return false;
        }
    }

    public async setSpeakerphoneOn(enabled: boolean): Promise<boolean> {
        if (!this.isNative) return false;
        try {
            await VibeOnMedia.setSpeakerphoneOn({ enabled });
            return true;
        } catch (error) {
            console.warn('[NativeCallNotification] Speaker routing failed:', error);
            return false;
        }
    }

    public async abandonAudioFocus(): Promise<void> {
        if (!this.isNative) return;
        try { await VibeOnMedia.abandonAudioFocus(); } catch (error) {
            console.warn('[NativeCallNotification] Audio focus release failed:', error);
        }
    }

    public async setupAudioLifecycleListeners(handlers: {
        onFocusLost: () => void;
        onFocusGained: () => void;
        onBecomingNoisy: () => void;
    }): Promise<void> {
        if (!this.isNative) return;
        await Promise.all(this.lifecycleListenerHandles.map((handle) => handle.remove()));
        this.lifecycleListenerHandles = [];
        try {
            const focus = await VibeOnMedia.addListener('audioFocusChanged', ({ event }) => {
                if (event === 'audioFocusLost') handlers.onFocusLost();
                if (event === 'audioFocusGained') handlers.onFocusGained();
            });
            const noisy = await VibeOnMedia.addListener('becomingNoisy', () => handlers.onBecomingNoisy());
            this.lifecycleListenerHandles.push(focus, noisy);
        } catch (error) {
            console.warn('[NativeCallNotification] Audio lifecycle listeners unavailable:', error);
        }
    }

    public async removeAudioLifecycleListeners(): Promise<void> {
        await Promise.all(this.lifecycleListenerHandles.map((handle) => handle.remove().catch(() => undefined)));
        this.lifecycleListenerHandles = [];
    }

    public async showIncomingCallNotification(options: { callerName: string; callType: string }): Promise<void> {
        if (!this.isNative) return;
        try {
            await VibeOnMedia.showIncomingCallNotification(options);
        } catch (error) {
            console.warn('[NativeCallNotification] Incoming call notification failed:', error);
        }
    }

    public async clearIncomingCallNotification(): Promise<void> {
        if (!this.isNative) return;
        try {
            await VibeOnMedia.clearIncomingCallNotification();
        } catch (error) {
            console.warn('[NativeCallNotification] Incoming call notification cleanup failed:', error);
        }
    }

    public async showCallNotification(options: {
        friendName: string;
        callType: string;
        isMuted: boolean;
        duration: string;
    }): Promise<void> {
        if (!this.isNative) return;
        try {
            await VibeOnMedia.showCallNotification(options);
        } catch (err) {
            console.warn('[NativeCallNotification] Failed to show ongoing call notification:', err);
        }
    }

    public async clearCallNotification(): Promise<void> {
        if (!this.isNative) return;
        try {
            await VibeOnMedia.clearCallNotification();
        } catch (err) {
            console.warn('[NativeCallNotification] Failed to clear call notification:', err);
        }
    }

    public async setupActionListener(
        onAction: (action: 'toggleMute' | 'endCall' | 'acceptCall' | 'declineCall') => void
    ): Promise<void> {
        if (!this.isNative) return;
        if (this.listenerHandle) {
            await this.listenerHandle.remove();
            this.listenerHandle = null;
        }
        try {
            this.listenerHandle = await VibeOnMedia.addListener('callNotificationAction', (data) => {
                if (data?.action) {
                    onAction(data.action);
                }
            });
        } catch (err) {
            console.warn('[NativeCallNotification] Failed to bind native action listener:', err);
        }
    }

    public async removeActionListener(): Promise<void> {
        if (this.listenerHandle) {
            try {
                await this.listenerHandle.remove();
            } catch {
                // Silently ignore listener disposal errors
            }
            this.listenerHandle = null;
        }
    }
}

export const nativeCallNotificationService = new NativeCallNotificationService();
