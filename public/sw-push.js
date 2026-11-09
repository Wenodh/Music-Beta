// public/sw-push.js - Vibe On Web Push Service Worker
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Vibe On', body: event.data.text() };
    }

    const title = data.title || 'Vibe On';
    const options = {
        body: data.body || '',
        icon: '/vibeon-logo.png',
        badge: '/vibeon-logo.png',
        data: data.data || {},
        tag: data.tag || 'vibeon-notification',
        renotify: true,
        requireInteraction: data.data?.type === 'incoming_call',
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const notificationData = event.notification.data || {};
    let targetUrl = '/';

    if (notificationData.type === 'incoming_call' || notificationData.type === 'direct_message') {
        targetUrl = '/friends';
    } else if (notificationData.type === 'party_invitation') {
        targetUrl = notificationData.roomCode ? `/party/${notificationData.roomCode}` : '/';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client && targetUrl) {
                        return client.navigate(targetUrl);
                    }
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
