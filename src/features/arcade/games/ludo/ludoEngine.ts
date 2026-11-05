export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoToken {
    id: number; // 0..3
    color: LudoColor;
    step: number; // -1 = home base/yard, 0..50 = track steps, 51..56 = home path (56 = finished)
}

export interface LudoPlayer {
    color: LudoColor;
    isBot: boolean;
    name: string;
    tokens: LudoToken[];
}

export const LUDO_COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

// Starting track offset index (0..51) on the main shared perimeter ring
export const COLOR_START_OFFSETS: Record<LudoColor, number> = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39,
};

// Global coordinates on the 52-cell track considered safe squares (stars/starting spots)
export const SAFE_SQUARES = new Set<number>([
    0,   // Red start
    8,   // Red safe
    13,  // Green start
    21,  // Green safe
    26,  // Yellow start
    34,  // Yellow safe
    39,  // Blue start
    47,  // Blue safe
]);

export class LudoEngine {
    public static createTokens(color: LudoColor): LudoToken[] {
        return [0, 1, 2, 3].map((id) => ({
            id,
            color,
            step: -1, // in yard
        }));
    }

    public static createDefaultPlayers(playerConfigs: { color: LudoColor; isBot: boolean; name?: string }[]): LudoPlayer[] {
        return playerConfigs.map((cfg) => ({
            color: cfg.color,
            isBot: cfg.isBot,
            name: cfg.name || (cfg.isBot ? `Bot (${cfg.color})` : `Player (${cfg.color})`),
            tokens: this.createTokens(cfg.color),
        }));
    }

    /**
     * Converts a token's step count (0..50) to its global ring index (0..51).
     */
    public static getGlobalRingIndex(color: LudoColor, step: number): number {
        if (step < 0 || step > 50) return -1;
        const start = COLOR_START_OFFSETS[color];
        return (start + step) % 52;
    }

    /**
     * Determines whether a given token can make a legal move with the rolled dice value.
     */
    public static canTokenMove(token: LudoToken, dice: number): boolean {
        // Token in yard requires a 6 to enter the track
        if (token.step === -1) {
            return dice === 6;
        }

        // Already finished
        if (token.step === 56) {
            return false;
        }

        // Exact roll needed to reach home finish at 56
        return token.step + dice <= 56;
    }

    /**
     * Returns list of token IDs for a player that can legally move with the dice roll.
     */
    public static getMovableTokens(player: LudoPlayer, dice: number): number[] {
        return player.tokens
            .filter((t) => this.canTokenMove(t, dice))
            .map((t) => t.id);
    }

    /**
     * Executes the move for a token. Handles entry from yard, movement along track & home stretch,
     * captures on unprotected squares, and extra turns for rolling a 6 or capturing.
     * Returns { nextPlayers, capturedToken, extraTurn, finished }
     */
    public static moveToken(
        players: LudoPlayer[],
        playerIndex: number,
        tokenId: number,
        dice: number
    ): {
        nextPlayers: LudoPlayer[];
        capturedToken: { color: LudoColor; tokenId: number } | null;
        extraTurn: boolean;
        tokenFinished: boolean;
    } {
        const nextPlayers = players.map((p) => ({
            ...p,
            tokens: p.tokens.map((t) => ({ ...t })),
        }));

        const currentPlayer = nextPlayers[playerIndex];
        const token = currentPlayer.tokens.find((t) => t.id === tokenId);
        if (!token || !this.canTokenMove(token, dice)) {
            return { nextPlayers, capturedToken: null, extraTurn: false, tokenFinished: false };
        }

        let extraTurn = dice === 6;
        let tokenFinished = false;

        if (token.step === -1) {
            // Enter board at starting position (step 0)
            token.step = 0;
        } else {
            token.step += dice;
            if (token.step === 56) {
                tokenFinished = true;
                extraTurn = true; // Bonus turn for finishing a token
            }
        }

        let capturedToken: { color: LudoColor; tokenId: number } | null = null;

        // Check for captures on standard track steps (0..50)
        if (token.step >= 0 && token.step <= 50) {
            const globalRingPos = this.getGlobalRingIndex(token.color, token.step);

            // Cannot capture if square is a safe square
            if (!SAFE_SQUARES.has(globalRingPos)) {
                // Check all opponent tokens
                for (let pi = 0; pi < nextPlayers.length; pi++) {
                    if (pi === playerIndex) continue;
                    const opponent = nextPlayers[pi];

                    for (const oppToken of opponent.tokens) {
                        if (oppToken.step >= 0 && oppToken.step <= 50) {
                            const oppGlobalPos = this.getGlobalRingIndex(oppToken.color, oppToken.step);
                            if (oppGlobalPos === globalRingPos) {
                                // Knock out opponent token back to yard!
                                oppToken.step = -1;
                                capturedToken = { color: oppToken.color, tokenId: oppToken.id };
                                extraTurn = true; // Knockout grants an extra turn
                                break;
                            }
                        }
                    }
                    if (capturedToken) break;
                }
            }
        }

        return { nextPlayers, capturedToken, extraTurn, tokenFinished };
    }

    /**
     * Checks if a player has won (all 4 tokens finished at step 56).
     */
    public static hasPlayerWon(player: LudoPlayer): boolean {
        return player.tokens.every((t) => t.step === 56);
    }

    /**
     * Smart heuristic AI decision to pick the best token move:
     * 1. Finishing a token into home (step + dice === 56)
     * 2. Knocking out an opponent's token
     * 3. Releasing a token from yard on a 6
     * 4. Moving an in-danger token to safety
     * 5. Advancing the furthest leading token
     */
    public static selectBotMove(player: LudoPlayer, allPlayers: LudoPlayer[], dice: number): number | null {
        const movableIds = this.getMovableTokens(player, dice);
        if (movableIds.length === 0) return null;
        if (movableIds.length === 1) return movableIds[0];

        let bestTokenId = movableIds[0];
        let bestScore = -Infinity;

        for (const tid of movableIds) {
            const token = player.tokens.find((t) => t.id === tid)!;
            let score = 0;

            // 1. Can finish token
            if (token.step + dice === 56) {
                score += 1000;
            }

            // 2. Can release from yard
            if (token.step === -1 && dice === 6) {
                score += 500;
            }

            // 3. Can capture opponent
            if (token.step >= 0 && token.step + dice <= 50) {
                const targetGlobal = this.getGlobalRingIndex(token.color, token.step + dice);
                if (!SAFE_SQUARES.has(targetGlobal)) {
                    for (const opp of allPlayers) {
                        if (opp.color === player.color) continue;
                        for (const oppToken of opp.tokens) {
                            if (oppToken.step >= 0 && oppToken.step <= 50) {
                                const oppPos = this.getGlobalRingIndex(oppToken.color, oppToken.step);
                                if (oppPos === targetGlobal) {
                                    score += 800;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // 4. Progress towards home
            score += (token.step + dice) * 2;

            if (score > bestScore) {
                bestScore = score;
                bestTokenId = tid;
            }
        }

        return bestTokenId;
    }
}
