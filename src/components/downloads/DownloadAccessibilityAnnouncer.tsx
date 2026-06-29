import React, { useState, useEffect } from 'react';
import { EventBus } from '../../lib/events';
import { DownloadTask } from '../../lib/downloads/types';
import { eventBus } from '../../lib/events';

export const DownloadAccessibilityAnnouncer: React.FC = () => {
    const [announcement, setAnnouncement] = useState('');
    const lastProgressRef = React.useRef<Record<string, number>>({});

    useEffect(() => {
        const handleProgress = (task: DownloadTask) => {
            const lastProgress = lastProgressRef.current[task.id] || 0;
            let msg = '';

            if (task.status === 'downloading') {
                if (lastProgress === 0 && task.progress > 0) {
                    msg = `Download started: ${task.mediaItem.title}`;
                } else if (task.progress >= 25 && lastProgress < 25) {
                    msg = `${task.mediaItem.title}: 25 percent complete`;
                } else if (task.progress >= 50 && lastProgress < 50) {
                    msg = `${task.mediaItem.title}: 50 percent complete`;
                } else if (task.progress >= 75 && lastProgress < 75) {
                    msg = `${task.mediaItem.title}: 75 percent complete`;
                }
            } else if (task.status === 'completed' && lastProgress < 100) {
                msg = `Download completed: ${task.mediaItem.title}`;
            } else if (task.status === 'failed') {
                msg = `Download failed: ${task.mediaItem.title}`;
            }

            if (msg) {
                setAnnouncement(msg);
                // Clear announcement after a delay to allow re-announcing same message if needed
                setTimeout(() => setAnnouncement(''), 1000);
            }
            lastProgressRef.current[task.id] = task.progress;
        };

        eventBus.on('DOWNLOAD_PROGRESS', handleProgress);
        return () => eventBus.off('DOWNLOAD_PROGRESS', handleProgress);
    }, []);

    return (
        <div
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            {announcement}
        </div>
    );
};
