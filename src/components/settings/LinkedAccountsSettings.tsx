import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { accountLinkingService, LinkedAccount } from '../../lib/auth/AccountLinkingService';
import { oauthManager } from '../../lib/auth/OAuthManager';
import { providerRegistry } from '../../lib/audio-sdk/registry';
import { eventBus } from '../../lib/events';
import { motion, AnimatePresence } from 'framer-motion';
import { IoLinkOutline, IoUnlinkOutline, IoCheckmarkCircle, IoAlertCircleOutline } from 'react-icons/io5';

const LinkedAccountsSettings: React.FC = () => {
    const [accounts, setAccounts] = useState<LinkedAccount[]>(accountLinkingService.getAccounts());
    const [isLoading, setIsLoading] = useState<string | null>(null);

    useEffect(() => {
        const updateAccounts = (newAccounts: LinkedAccount[]) => setAccounts(newAccounts);
        eventBus.on('ACCOUNTS_CHANGED', updateAccounts);
        return () => { eventBus.off('ACCOUNTS_CHANGED', updateAccounts); };
    }, []);

    const handleConnect = async (providerId: string) => {
        setIsLoading(providerId);
        try {
            await oauthManager.initiateLogin(providerId);
        } catch (error) {
            logger.error('Failed to initiate login', error);
        } finally {
            setIsLoading(null);
        }
    };

    const handleDisconnect = async (providerId: string) => {
        if (window.confirm(`Are you sure you want to disconnect your ${providerId} account?`)) {
            setIsLoading(providerId);
            try {
                await accountLinkingService.unlinkAccount(providerId);
            } catch (error) {
                logger.error('Failed to disconnect', error);
            } finally {
                setIsLoading(null);
            }
        }
    };

    const providers = [
        { id: 'spotify', name: 'Spotify', icon: 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png' },
        { id: 'apple', name: 'Apple Music', icon: 'https://www.apple.com/v/apple-music/q/images/overview/icon_apple_music__f6as9cc8p76y_large.png' },
        { id: 'youtube', name: 'YouTube Music', icon: 'https://music.youtube.com/img/on_platform_logo_dark.svg' }
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <IoLinkOutline /> Linked Accounts
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect your streaming accounts to access your playlists, favorites, and recommendations directly within Vibe On.
            </p>

            <div className="space-y-3">
                {providers.map((provider) => {
                    const linked = accounts.find(a => a.providerId === provider.id);
                    const isConnecting = isLoading === provider.id;

                    return (
                        <div
                            key={provider.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center p-2 shadow-sm">
                                    <img src={provider.icon} alt={provider.name} className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{provider.name}</p>
                                    {linked ? (
                                        <p className="text-[10px] text-green-500 flex items-center gap-1">
                                            <IoCheckmarkCircle /> Connected
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-gray-400">Not connected</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => linked ? handleDisconnect(provider.id) : handleConnect(provider.id)}
                                disabled={!!isLoading}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    linked
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-red-500 hover:text-white'
                                        : 'bg-primary text-white hover:opacity-90'
                                }`}
                            >
                                {isConnecting ? '...' : (linked ? 'Disconnect' : 'Connect')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LinkedAccountsSettings;
