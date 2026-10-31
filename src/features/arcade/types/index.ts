export type ArcadeGameId = 'singer-snake' | 'flappy-star' | 'vibe-runner';

export type ThemeSelectionMode = 'auto' | 'manual' | 'default';

export interface GameTheme {
    id: string;
    name: string;
    artistOrGenre: string;
    keywords: string[];
    colors: {
        background: string;
        ground: string;
        accent: string;
        secondaryAccent: string;
        character: string;
        obstacle: string;
        collectible: string;
    };
    characterName: string;
    characterSprite: 'neon-snake' | 'rockstar' | 'retro-dancer' | 'cyber-runner' | 'pixel-star';
    obstacleType: 'speakers' | 'equalizer-pipes' | 'cables-amps' | 'notes';
    collectibleName: string;
    specialItemName?: string;
}

export interface DialogueItem {
    id: string;
    text: string;
    language: 'english' | 'telugu' | 'hindi';
    trigger: 'start' | 'game-over' | 'milestone' | 'special-item' | 'new-high-score';
}

export interface ArcadeSettings {
    themeMode: ThemeSelectionMode;
    selectedThemeId: string;
    sfxEnabled: boolean;
    sfxVolume: number; // 0 to 1
    dialogueEnabled: boolean;
    dialogueLanguage: 'auto' | 'english' | 'telugu' | 'hindi';
}

export interface GameScoreRecord {
    gameId: ArcadeGameId;
    highScore: number;
    lastScore: number;
    playedAt: number;
}
