/**
 * Daily Seed Engine for Vibe Arcade
 * Generates deterministic, UTC-date-based pseudo-random number generators (PRNG)
 * and daily seed identifiers with algorithm versioning.
 */

export class DailySeedEngine {
    public static readonly SEED_ALGORITHM_VERSION = 'v1';

    /**
     * Returns UTC date formatted as YYYY-MM-DD
     */
    public static getTodayUtcString(): string {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Returns a stable composite daily seed for a game: e.g. "vibe-queens:v1:2026-11-05"
     */
    public static getDailySeed(gameId: string, customDateUtc?: string): string {
        const dateStr = customDateUtc || this.getTodayUtcString();
        return `${gameId}:${this.SEED_ALGORITHM_VERSION}:${dateStr}`;
    }

    /**
     * Simple deterministic Mulberry32 PRNG based on a numeric 32-bit seed.
     */
    public static createPrng(seedStr: string): () => number {
        let h = 0;
        for (let i = 0; i < seedStr.length; i++) {
            h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
        }

        let a = h >>> 0;
        return function () {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Returns an integer within [min, max] inclusive using a PRNG function.
     */
    public static randInt(prng: () => number, min: number, max: number): number {
        return Math.floor(prng() * (max - min + 1)) + min;
    }

    /**
     * Shuffles an array in place deterministically using Fisher-Yates with PRNG.
     */
    public static shuffle<T>(array: T[], prng: () => number): T[] {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(prng() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
}
