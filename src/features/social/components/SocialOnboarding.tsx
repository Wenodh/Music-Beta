import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { profileService } from '../services/ProfileService';
import { setCurrentUserProfile } from '../socialSlice';
import { motion, AnimatePresence } from 'framer-motion';

const SocialOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const dispatch = useDispatch();
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [available, setAvailable] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);
    const [socialEnabled, setSocialEnabled] = useState(false);

    const checkUsername = async (val: string) => {
        if (val.length < 3) {
            setAvailable(null);
            return;
        }
        setChecking(true);
        const isAvail = await profileService.isUsernameAvailable(val);
        setAvailable(isAvail);
        setChecking(false);
    };

    const handleNext = () => {
        if (step === 1 && socialEnabled) {
            setStep(2);
        } else if (step === 1 && !socialEnabled) {
            onComplete();
        } else if (step === 2 && available) {
            setStep(3);
        }
    };

    const handleFinish = async () => {
        const profile = {
            username: username.toLowerCase(),
            displayName: username,
            isOnboarded: true,
            privacySettings: {
                profile: 'private',
                activity: 'private',
                listening: 'private',
                favorites: 'private',
                playlists: 'private',
                followers: 'visible',
                following: 'visible'
            }
        };

        await profileService.updateProfile(profile as any);
        onComplete();
    };

    return (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-card p-8 rounded-[2rem] shadow-2xl border border-secondary/10">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-4">Vibe On Social</h1>
                            <p className="text-secondary text-sm mb-8">Share your music journey with friends. Discover what others are listening to and collaborate on playlists.</p>

                            <div
                                onClick={() => setSocialEnabled(!socialEnabled)}
                                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer mb-8 flex items-center gap-4 ${socialEnabled ? 'border-primary bg-primary/5' : 'border-secondary/10 bg-secondary/5'}`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${socialEnabled ? 'border-primary bg-primary' : 'border-secondary/20'}`}>
                                    {socialEnabled && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm">Enable social features</p>
                                    <p className="text-[10px] text-secondary">Private by default. Opt-out anytime.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold"
                            >
                                {socialEnabled ? 'Continue' : 'Maybe Later'}
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h1 className="text-2xl font-bold mb-2">Pick a username</h1>
                            <p className="text-secondary text-sm mb-8">This is how friends will find you. You can't change this later.</p>

                            <div className="relative mb-8">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">@</span>
                                <input
                                    autoFocus
                                    className="w-full bg-secondary/5 border border-secondary/10 rounded-2xl py-4 pl-8 pr-4 font-bold outline-none focus:border-primary"
                                    placeholder="username"
                                    value={username}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                        setUsername(val);
                                        checkUsername(val);
                                    }}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {checking && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                                    {!checking && available === true && <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>}
                                    {!checking && available === false && <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg>}
                                </div>
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!available}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold disabled:opacity-50"
                            >
                                Next
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-green-500">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h1 className="text-2xl font-bold mb-4">You're all set!</h1>
                            <p className="text-secondary text-sm mb-8">Your profile is private by default. You can change your visibility settings at any time in your profile.</p>

                            <button
                                onClick={handleFinish}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold"
                            >
                                Start Vibing
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SocialOnboarding;
