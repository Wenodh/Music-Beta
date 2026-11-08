import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

interface VibeOnMediaPluginInterface {
    requestAudioFocus(): Promise<{ granted: boolean }>;
    abandonAudioFocus(): Promise<void>;
    showCallNotification(options: {
        friendName: string;
        callType: string;
        isMuted: boolean;
        duration: string;
    }): Promise<void>;
    clearCallNotification(): Promise<void>;
    addListener(
        eventName: 'callNotificationAction',
        listenerFunc: (data: { action: 'toggleMute' | 'endCall' }) => void
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
        onAction: (action: 'toggleMute' | 'endCall') => void
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
