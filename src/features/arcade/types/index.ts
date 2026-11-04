export type ArcadeGameId =
    // Category 1: LinkedIn & Daily Mind Puzzles
    | 'vibe-queens'
    | 'beat-tango'
    | 'music-pinpoint'
    | 'crossclimb'
    | 'vibe-word'
    // Category 2: Numbers & Logic Masters
    | '2048-beat'
    | 'vibe-sudoku'
    | 'sound-sweeper'
    | 'picross-music'
    | 'slide-puzzle'
    // Category 3: Classic Board & Tabletop
    | 'ludo-mini'
    | 'tic-tac-toe'
    | 'connect-four'
    | 'vibe-checkers'
    | 'carrom-disc'
    // Category 4: Retro Arcade Classics
    | 'singer-snake'
    | 'flappy-star'
    | 'vibe-runner'
    | 'beat-breaker'
    | 'cosmic-beats'
    // Category 5: Casual, Rhythm & Cards
    | 'beat-drop'
    | 'rhythm-tap'
    | 'simon-beats'
    | 'memory-flip'
    | 'vibe-solitaire';

export type ArcadeCategory =
    | 'mind'
    | 'logic'
    | 'board'
    | 'tabletop'
    | 'retro'
    | 'rhythm';

export type ArcadeMetricType = 'points' | 'time_ms' | 'moves' | 'streak';

export interface GameScoreRecord {
    gameId: ArcadeGameId;
    metricType: ArcadeMetricType;
    bestScore: number;         // Lower is better for time_ms & moves; Higher is better for points & streak
    lastScore: number;
    bestDisplayValue: string;
    lastDisplayValue: string;
    playedAt: number;
    difficulty?: string;
    mode?: 'daily' | 'practice';
    dailySeed?: string;
}

export interface GameScoreEntry {
    id?: string;
    gameId: ArcadeGameId;
    metricType: ArcadeMetricType;
    score: number;
    displayValue: string;
    playedAt: number;
    userId?: string;
    username?: string;
    avatarUrl?: string;
    levelOrDifficulty?: string;
    mode?: 'daily' | 'practice';
    dailySeed?: string;
}

export interface ArcadeLeaderboardItem {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    gameId: ArcadeGameId;
    metricType: ArcadeMetricType;
    score: number;
    displayValue: string;
    difficulty: string;
    mode?: string;
    createdAt: string;
    rank?: number;
    isCurrentUser?: boolean;
}

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
    artistImageUrl?: string;
    albumArtworkUrl?: string;
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

export interface ArcadeGameMetadata {
    id: ArcadeGameId;
    title: string;
    desc: string;
    icon: string;
    tag: string;
    category: ArcadeCategory;
    metricType: ArcadeMetricType;
    metricUnit: string;
    lowerIsBetter: boolean;
    supportsDaily: boolean;
    batch: 1 | 2 | 3 | 4;
}
