import { useEffect } from 'react';
import { platformManager } from '../lib/platform/PlatformIntegrationManager';
import { MediaSessionAdapter } from '../lib/platform/adapters/MediaSessionAdapter';
import { CastAdapter } from '../lib/platform/adapters/CastAdapter';
import { AirPlayAdapter } from '../lib/platform/adapters/AirPlayAdapter';
import { DeepLinkAdapter } from '../lib/platform/adapters/DeepLinkAdapter';
import { DesktopAdapter } from '../lib/platform/adapters/DesktopAdapter';
import { AutomotiveAdapter } from '../lib/platform/adapters/AutomotiveAdapter';
import { WearableAdapter } from '../lib/platform/adapters/WearableAdapter';
import { NotificationAdapter } from '../lib/platform/adapters/NotificationAdapter';

export const AppInitializer = () => {
    useEffect(() => {
        const init = async () => {
            platformManager.registerAdapter(new MediaSessionAdapter());
            platformManager.registerAdapter(new CastAdapter());
            platformManager.registerAdapter(new AirPlayAdapter());
            platformManager.registerAdapter(new DeepLinkAdapter());
            platformManager.registerAdapter(new DesktopAdapter());
            platformManager.registerAdapter(new AutomotiveAdapter());
            platformManager.registerAdapter(new WearableAdapter());
            platformManager.registerAdapter(new NotificationAdapter());
            // Other adapters will be registered here
            await platformManager.initialize();
        };
        init();
    }, []);

    return null;
};
