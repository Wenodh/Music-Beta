import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../hooks/redux';
import { SongThemeEngine } from '../engine/songThemeEngine';
import { ArcadeGameId, ArcadeSettings } from '../types';
import { getArcadeSettings } from '../services/arcadeStorage';
import { SingerSnake } from '../games/snake/SingerSnake';
import { FlappyStar } from '../games/flappy-bird/FlappyStar';
import { VibeRunner } from '../games/dino-runner/VibeRunner';
import { NowPlayingMini } from '../components/NowPlayingMini';

export const ArcadeGameView: React.FC = () => {
    const { gameId } = useParams<{ gameId: ArcadeGameId }>();
    const navigate = useNavigate();
    const { currentSong } = useAppSelector((state) => state.musicPlayer);

    const [settings, setSettings] = useState<ArcadeSettings>({
        themeMode: 'auto',
        selectedThemeId: 'synthwave-beats',
        sfxEnabled: false,
        sfxVolume: 0.2,
        dialogueEnabled: true,
        dialogueLanguage: 'auto',
    });

    useEffect(() => {
        getArcadeSettings().then(setSettings);
    }, []);

    // Capture round theme on mount or round start
    const initialThemeRef = useRef(
        SongThemeEngine.resolveTheme(currentSong, settings.themeMode, settings.selectedThemeId)
    );

    const songLanguage = (currentSong as any)?.language;

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-start pt-4 pb-36 px-2">
            <div className="mb-4">
                <NowPlayingMini />
            </div>

            {gameId === 'singer-snake' && (
                <SingerSnake
                    theme={initialThemeRef.current}
                    dialogueEnabled={settings.dialogueEnabled}
                    dialogueLanguage={settings.dialogueLanguage}
                    songLanguage={songLanguage}
                    onBack={() => navigate('/arcade')}
                />
            )}

            {gameId === 'flappy-star' && (
                <FlappyStar
                    theme={initialThemeRef.current}
                    dialogueEnabled={settings.dialogueEnabled}
                    dialogueLanguage={settings.dialogueLanguage}
                    songLanguage={songLanguage}
                    onBack={() => navigate('/arcade')}
                />
            )}

            {gameId === 'vibe-runner' && (
                <VibeRunner
                    theme={initialThemeRef.current}
                    dialogueEnabled={settings.dialogueEnabled}
                    dialogueLanguage={settings.dialogueLanguage}
                    songLanguage={songLanguage}
                    onBack={() => navigate('/arcade')}
                />
            )}
        </div>
    );
};
