import { PlatformAdapter, PlatformCapabilities } from '../types';
import { showToast } from '../../../features/ui/uiSlice';
import { store } from '../../../store';

export class NotificationAdapter implements PlatformAdapter {
    id = 'notifications';

    async initialize() {
        if (!('Notification' in window)) return;
    }

    public async showPlaybackNotification(title: string, body: string) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification(title, { body });
            }
        }
    }

    destroy() {}

    getCapabilities(): Partial<PlatformCapabilities> {
        return {
            notifications: 'Notification' in window
        };
    }
}
