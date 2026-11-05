export interface PicrossPuzzle {
    id: string;
    title: string;
    size: number; // 5, 10, or 15
    rowClues: number[][];
    colClues: number[][];
    solution: boolean[][]; // true = filled, false = empty
}

// Pixel art presets representing musical instruments & symbols
export const PICROSS_PRESETS: { id: string; title: string; size: number; grid: string[] }[] = [
    {
        id: 'picross-note',
        title: 'Eighth Note',
        size: 5,
        grid: [
            '.###.',
            '.#.#.',
            '.#...',
            '##...',
            '##...',
        ],
    },
    {
        id: 'picross-mic',
        title: 'Studio Mic',
        size: 5,
        grid: [
            '.###.',
            '.###.',
            '.###.',
            '..#..',
            '.###.',
        ],
    },
    {
        id: 'picross-headphones',
        title: 'DJ Headphones',
        size: 10,
        grid: [
            '..######..',
            '.#......#.',
            '#........#',
            '#........#',
            '##......##',
            '###....###',
            '###....###',
            '###....###',
            '.#......#.',
            '..........',
        ],
    },
    {
        id: 'picross-guitar',
        title: 'Acoustic Guitar',
        size: 10,
        grid: [
            '.......##.',
            '......##..',
            '.....##...',
            '....##....',
            '...####...',
            '..##..##..',
            '.##....##.',
            '.##....##.',
            '..######..',
            '...####...',
        ],
    },
];

export class PicrossEngine {
    public static parseClues(line: boolean[]): number[] {
        const clues: number[] = [];
        let currentRun = 0;

        for (const filled of line) {
            if (filled) {
                currentRun++;
            } else if (currentRun > 0) {
                clues.push(currentRun);
                currentRun = 0;
            }
        }
        if (currentRun > 0) {
            clues.push(currentRun);
        }

        return clues.length > 0 ? clues : [0];
    }

    public static createPuzzleFromPreset(preset: typeof PICROSS_PRESETS[0]): PicrossPuzzle {
        const size = preset.size;
        const solution: boolean[][] = [];

        for (let r = 0; r < size; r++) {
            const row: boolean[] = [];
            for (let c = 0; c < size; c++) {
                row.push(preset.grid[r][c] === '#');
            }
            solution.push(row);
        }

        // Generate row clues
        const rowClues = solution.map((row) => this.parseClues(row));

        // Generate col clues
        const colClues: number[][] = [];
        for (let c = 0; c < size; c++) {
            const col = solution.map((row) => row[c]);
            colClues.push(this.parseClues(col));
        }

        return {
            id: preset.id,
            title: preset.title,
            size,
            rowClues,
            colClues,
            solution,
        };
    }

    public static isSolved(userGrid: (boolean | null)[][], solution: boolean[][]): boolean {
        const size = solution.length;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const userFilled = userGrid[r][c] === true;
                const targetFilled = solution[r][c];
                if (userFilled !== targetFilled) {
                    return false;
                }
            }
        }
        return true;
    }
}
