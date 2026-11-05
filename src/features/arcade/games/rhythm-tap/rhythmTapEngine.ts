export interface RhythmNote {
    id: number;
    lane: 0 | 1 | 2 | 3;
    y: number; // 0 to 100 percentage down lane
    hit: boolean;
    missed: boolean;
}

export type HitRating = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export class RhythmTapEngine {
    static spawnNote(id: number, lane?: 0 | 1 | 2 | 3): RhythmNote {
        const selectedLane = lane !== undefined ? lane : (Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3);
        return {
            id,
            lane: selectedLane,
            y: 0,
            hit: false,
            missed: false,
        };
    }

    static evaluateHit(noteY: number, targetY = 85, tolerance = 15): { rating: HitRating; points: number } | null {
        const diff = Math.abs(noteY - targetY);
        if (diff > tolerance) return null;

        if (diff <= 4) {
            return { rating: 'PERFECT', points: 300 };
        } else if (diff <= 8) {
            return { rating: 'GREAT', points: 150 };
        } else {
            return { rating: 'GOOD', points: 50 };
        }
    }

    static updateNotes(
        notes: RhythmNote[],
        speed: number,
        targetY = 85,
        tolerance = 15
    ): { updatedNotes: RhythmNote[]; newlyMissed: number } {
        let newlyMissed = 0;
        const updated: RhythmNote[] = [];

        for (const n of notes) {
            if (n.hit) continue; // Already processed
            const ny = n.y + speed;

            if (ny > targetY + tolerance && !n.missed) {
                newlyMissed++;
                updated.push({ ...n, y: ny, missed: true });
            } else if (ny <= 100) {
                updated.push({ ...n, y: ny });
            }
        }

        return { updatedNotes: updated, newlyMissed };
    }
}
