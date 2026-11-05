import { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type GameLifecycleState = 'idle' | 'playing' | 'paused' | 'gameover' | 'completed';

export interface UseArcadeGameLifecycleProps {
    onBack: () => void;
    onPauseStateChange?: (isPaused: boolean) => void;
    initialState?: GameLifecycleState;
}

export const useArcadeGameLifecycle = ({
    onBack,
    onPauseStateChange,
    initialState = 'idle',
}: UseArcadeGameLifecycleProps) => {
    const [gameState, setGameState] = useState<GameLifecycleState>(initialState);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const gameStateRef = useRef<GameLifecycleState>(initialState);
    const showExitConfirmRef = useRef(false);

    gameStateRef.current = gameState;
    showExitConfirmRef.current = showExitConfirm;

    // Notify caller when pause state toggles
    useEffect(() => {
        onPauseStateChange?.(gameState === 'paused' || showExitConfirm);
    }, [gameState, showExitConfirm, onPauseStateChange]);

    const pauseGame = useCallback(() => {
        if (gameStateRef.current === 'playing') {
            setGameState('paused');
        }
        setShowExitConfirm(true);
    }, []);

    const resumeGame = useCallback(() => {
        setShowExitConfirm(false);
        if (gameStateRef.current === 'paused') {
            setGameState('playing');
        }
    }, []);

    const exitGame = useCallback(() => {
        setShowExitConfirm(false);
        onBack();
    }, [onBack]);

    // Native Capacitor Android Back Button handling for active games
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let isMounted = true;
        let handlePromise: any = null;

        const registerBackHandler = async () => {
            const handle = await CapApp.addListener('backButton', () => {
                // If game is actively playing, open pause/exit confirmation
                if (gameStateRef.current === 'playing') {
                    pauseGame();
                    return;
                }

                // If exit confirmation is already open, do not bypass or terminate unexpectedly; maintain modal
                if (showExitConfirmRef.current) {
                    return;
                }

                // If idle or gameover or completed, navigate back to arcade
                if (
                    gameStateRef.current === 'idle' ||
                    gameStateRef.current === 'gameover' ||
                    gameStateRef.current === 'completed'
                ) {
                    exitGame();
                }
            });

            if (!isMounted) {
                handle.remove();
            } else {
                handlePromise = handle;
            }
        };

        registerBackHandler();

        return () => {
            isMounted = false;
            if (handlePromise) {
                handlePromise.remove();
            }
        };
    }, [pauseGame, exitGame]);

    // Keyboard 'Escape' key handler for desktop
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showExitConfirmRef.current) {
                    resumeGame();
                } else if (gameStateRef.current === 'playing') {
                    pauseGame();
                } else {
                    exitGame();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pauseGame, resumeGame, exitGame]);

    return {
        gameState,
        setGameState,
        showExitConfirm,
        setShowExitConfirm,
        pauseGame,
        resumeGame,
        exitGame,
    };
};
