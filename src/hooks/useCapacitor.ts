import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { useAppSelector } from './redux';

export const useCapacitor = () => {
    const { theme } = useAppSelector(state => state.ui);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Hide Splash Screen
        SplashScreen.hide();

        // Configure Status Bar
        const updateStatusBar = async () => {
            try {
                if (theme?.darkMode) {
                    await StatusBar.setStyle({ style: Style.Dark });
                    if (theme?.isOled) {
                        await StatusBar.setBackgroundColor({ color: '#000000' });
                    } else {
                        await StatusBar.setBackgroundColor({ color: '#030712' }); // gray-950
                    }
                } else {
                    await StatusBar.setStyle({ style: Style.Light });
                    await StatusBar.setBackgroundColor({ color: '#ffffff' });
                }
            } catch (e) {
                console.warn('StatusBar plugin error:', e);
            }
        };

        updateStatusBar();

        // Handle Back Button
        const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
                App.exitApp();
            } else {
                window.history.back();
            }
        });

        return () => {
            backButtonListener.then(l => l.remove());
        };
    }, [theme?.darkMode, theme?.isOled]);
};
