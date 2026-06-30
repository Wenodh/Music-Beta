import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformManager } from '../lib/platform/PlatformIntegrationManager';
import { DeepLinkAdapter } from '../lib/platform/adapters/DeepLinkAdapter';

export const useDeepLinking = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleDeepLink = (event: any) => {
            const url = event.url;
            if (url) {
                const adapter = platformManager.getAdapter<DeepLinkAdapter>('deep-links');
                const path = adapter?.parseDeepLink(url);
                if (path) navigate(path);
            }
        };

        // Listen for App URL open events (Capacitor)
        document.addEventListener('appUrlOpen', handleDeepLink);

        // Check for initial URL if needed

        return () => {
            document.removeEventListener('appUrlOpen', handleDeepLink);
        };
    }, [navigate]);
};
