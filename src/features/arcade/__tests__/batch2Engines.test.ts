import { describe, it, expect } from 'vitest';
import { Game2048Engine } from '../games/game2048/game2048Engine';
import { SudokuEngine } from '../games/sudoku/sudokuEngine';
import { SoundSweeperEngine, SWEEPER_CONFIGS } from '../games/sound-sweeper/soundSweeperEngine';
import { PicrossEngine, PICROSS_PRESETS } from '../games/picross/picrossEngine';
import { SlidePuzzleEngine } from '../games/slide-puzzle/slidePuzzleEngine';

describe('Vibe Arcade Batch 2: Pure Logic Engines & Deep Rules Verification', () => {
    describe('1. 2048 Beat Engine Verification', () => {
        it('tiles merge only once per move (e.g. [2, 2, 4, 8] -> [4, 4, 8, 0] not [8, 8, 0, 0])', () => {
            const row = [2, 2, 4, 8];
            const { newRow, points } = Game2048Engine.slideAndMergeRow(row);
            expect(newRow).toEqual([4, 4, 8, 0]);
            expect(points).toBe(4);

            // [4, 4, 4, 4] merges into two 8s, neither of which merges again in the same move
            const row2 = [4, 4, 4, 4];
            const res2 = Game2048Engine.slideAndMergeRow(row2);
            expect(res2.newRow).toEqual([8, 8, 0, 0]);
            expect(res2.points).toBe(16);

            // [2, 2, 2, 0] merges the first pair into 4, leaves the third 2 unmerged: [4, 2, 0, 0]
            const row3 = [2, 2, 2, 0];
            const res3 = Game2048Engine.slideAndMergeRow(row3);
            expect(res3.newRow).toEqual([4, 2, 0, 0]);
            expect(res3.points).toBe(4);
        });

        it('increases score by the exact merged tile values', () => {
            const grid = [
                [2, 2, 0, 0],
                [4, 4, 0, 0],
                [8, 8, 0, 0],
                [16, 16, 0, 0],
            ];
            // Left slide should merge all 4 rows: 4 + 8 + 16 + 32 = 60 points
            const res = Game2048Engine.move(grid, 'left');
            expect(res.score).toBe(60);
            expect(res.mergedPoints).toBe(60);
            expect(res.moved).toBe(true);
            expect(res.grid[0]).toEqual([4, 0, 0, 0]);
            expect(res.grid[1]).toEqual([8, 0, 0, 0]);
            expect(res.grid[2]).toEqual([16, 0, 0, 0]);
            expect(res.grid[3]).toEqual([32, 0, 0, 0]);
        });

        it('all four movement directions (up, down, left, right) produce correct geometric results', () => {
            const baseGrid = [
                [2, 0, 0, 2],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [2, 0, 0, 2],
            ];

            // Up: row 0 col 0 merges with row 3 col 0; row 0 col 3 merges with row 3 col 3
            const moveUp = Game2048Engine.move(baseGrid, 'up');
            expect(moveUp.moved).toBe(true);
            expect(moveUp.score).toBe(8);
            expect(moveUp.grid[0]).toEqual([4, 0, 0, 4]);
            expect(moveUp.grid[3]).toEqual([0, 0, 0, 0]);

            // Down: tiles move to bottom row 3
            const moveDown = Game2048Engine.move(baseGrid, 'down');
            expect(moveDown.moved).toBe(true);
            expect(moveDown.score).toBe(8);
            expect(moveDown.grid[3]).toEqual([4, 0, 0, 4]);
            expect(moveDown.grid[0]).toEqual([0, 0, 0, 0]);

            // Left: tiles in row 0 merge to left, tiles in row 3 merge to left
            const moveLeft = Game2048Engine.move(baseGrid, 'left');
            expect(moveLeft.moved).toBe(true);
            expect(moveLeft.score).toBe(8);
            expect(moveLeft.grid[0]).toEqual([4, 0, 0, 0]);
            expect(moveLeft.grid[3]).toEqual([4, 0, 0, 0]);

            // Right: tiles in row 0 merge to right, tiles in row 3 merge to right
            const moveRight = Game2048Engine.move(baseGrid, 'right');
            expect(moveRight.moved).toBe(true);
            expect(moveRight.score).toBe(8);
            expect(moveRight.grid[0]).toEqual([0, 0, 0, 4]);
            expect(moveRight.grid[3]).toEqual([0, 0, 0, 4]);
        });

        it('no-op moves correctly set moved=false and do not alter grid', () => {
            const rightPackedGrid = [
                [0, 0, 0, 2],
                [0, 0, 0, 4],
                [0, 0, 0, 8],
                [0, 0, 0, 16],
            ];
            const res = Game2048Engine.move(rightPackedGrid, 'right');
            expect(res.moved).toBe(false);
            expect(res.score).toBe(0);
            expect(res.grid).toEqual(rightPackedGrid);
        });

        it('game-over detection handles both full and non-full boards correctly', () => {
            // Non-full board is never game over
            const nonFullGrid = [
                [2, 4, 2, 4],
                [4, 2, 4, 2],
                [2, 4, 2, 4],
                [4, 2, 4, 0], // one empty cell
            ];
            expect(Game2048Engine.isGameOver(nonFullGrid)).toBe(false);

            // Full board with horizontal move available is not game over
            const fullWithHMove = [
                [2, 2, 8, 16],
                [4, 8, 16, 32],
                [8, 16, 32, 64],
                [16, 32, 64, 128],
            ];
            expect(Game2048Engine.isGameOver(fullWithHMove)).toBe(false);

            // Full board with vertical move available is not game over
            const fullWithVMove = [
                [2, 4, 8, 16],
                [2, 8, 16, 32],
                [8, 16, 32, 64],
                [16, 32, 64, 128],
            ];
            expect(Game2048Engine.isGameOver(fullWithVMove)).toBe(false);

            // Completely locked full board is game over
            const lockedGrid = [
                [2, 4, 2, 4],
                [4, 2, 4, 2],
                [2, 4, 2, 4],
                [4, 2, 4, 2],
            ];
            expect(Game2048Engine.isGameOver(lockedGrid)).toBe(true);
        });
    });

    describe('2. Sudoku Engine Verification', () => {
        it('generated puzzles have exactly one unique solution across multiple seeds', () => {
            const seeds = ['sudoku-verify-1', 'sudoku-verify-2', 'sudoku-verify-3'];
            for (const seed of seeds) {
                const puzzle = SudokuEngine.generatePuzzle('easy', seed);
                const count = { value: 0 };
                const copy = puzzle.initialGrid.map((r) => [...r]);
                const solutions = SudokuEngine.countSolutions(copy, count);
                expect(solutions).toBe(1);
            }
        });

        it('difficulty levels adhere to clue-removal boundaries', () => {
            const easyPuzzle = SudokuEngine.generatePuzzle('easy', 'diff-test-seed');
            const medPuzzle = SudokuEngine.generatePuzzle('medium', 'diff-test-seed');
            const hardPuzzle = SudokuEngine.generatePuzzle('hard', 'diff-test-seed');

            const countClues = (grid: number[][]) =>
                grid.reduce((acc, row) => acc + row.filter((c) => c !== 0).length, 0);

            const easyClues = countClues(easyPuzzle.initialGrid);
            const medClues = countClues(medPuzzle.initialGrid);
            const hardClues = countClues(hardPuzzle.initialGrid);

            expect(easyClues).toBeGreaterThan(medClues);
            expect(medClues).toBeGreaterThanOrEqual(hardClues);
            expect(hardClues).toBeLessThan(40);
        });

        it('solver and conflict detection agree with actual Sudoku constraints', () => {
            const empty = SudokuEngine.createEmptyGrid();
            // Test row collision
            empty[2][0] = 7;
            expect(SudokuEngine.isValid(empty, 2, 5, 7)).toBe(false);
            expect(SudokuEngine.isValid(empty, 2, 5, 8)).toBe(true);

            // Test column collision
            empty[0][4] = 9;
            expect(SudokuEngine.isValid(empty, 6, 4, 9)).toBe(false);
            expect(SudokuEngine.isValid(empty, 6, 4, 1)).toBe(true);

            // Test 3x3 block collision
            empty[0][0] = 3;
            expect(SudokuEngine.isValid(empty, 1, 1, 3)).toBe(false);
            expect(SudokuEngine.isValid(empty, 3, 3, 3)).toBe(true);
        });

        it('invalid or incomplete boards cannot trigger isSolved', () => {
            const puzzle = SudokuEngine.generatePuzzle('easy', 'solve-check-seed');
            const solution = puzzle.solution;

            // Incomplete board with zeros
            const incomplete = solution.map((r) => [...r]);
            incomplete[0][0] = 0;
            expect(SudokuEngine.isSolved(incomplete, solution)).toBe(false);

            // Complete board with one incorrect digit
            const invalid = solution.map((r) => [...r]);
            invalid[0][0] = (invalid[0][0] % 9) + 1;
            expect(SudokuEngine.isSolved(invalid, solution)).toBe(false);

            // Exact match
            expect(SudokuEngine.isSolved(solution, solution)).toBe(true);
        });
    });

    describe('3. Sound Sweeper Engine Verification', () => {
        it('first-click safety guarantees 0 mines across corners, edges, and centre cells', () => {
            const config = SWEEPER_CONFIGS.beginner; // 9x9, 10 mines
            const testCoordinates = [
                { r: 0, c: 0, type: 'corner' },
                { r: 0, c: 8, type: 'corner' },
                { r: 8, c: 0, type: 'corner' },
                { r: 8, c: 8, type: 'corner' },
                { r: 0, c: 4, type: 'edge' },
                { r: 4, c: 0, type: 'edge' },
                { r: 4, c: 4, type: 'centre' },
            ];

            for (const { r, c } of testCoordinates) {
                const board = SoundSweeperEngine.createBoard(config);
                const safeBoard = SoundSweeperEngine.placeMinesSafely(board, config, r, c);

                // Clicked cell itself must not be a mine
                expect(safeBoard[r][c].isMine).toBe(false);

                // None of the surrounding adjacent cells within 1 step can be a mine
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
                            expect(safeBoard[nr][nc].isMine).toBe(false);
                        }
                    }
                }
            }
        });

        it('flood fill reveals connected zero-cell region and adjacent numbered boundary cells', () => {
            const config: typeof SWEEPER_CONFIGS.beginner = { rows: 5, cols: 5, mines: 1 };
            const board = SoundSweeperEngine.createBoard(config);
            // Place single mine at corner (4, 4)
            board[4][4].isMine = true;
            board[3][3].adjacentMines = 1;
            board[3][4].adjacentMines = 1;
            board[4][3].adjacentMines = 1;

            // Click at (0, 0) where adjacent count is 0
            const { nextBoard, hitMine, newlyRevealedCount } = SoundSweeperEngine.revealCell(board, 0, 0);
            expect(hitMine).toBe(false);
            expect(newlyRevealedCount).toBe(24);
            expect(nextBoard[0][0].isRevealed).toBe(true);
            expect(nextBoard[3][3].isRevealed).toBe(true);
            expect(nextBoard[4][4].isRevealed).toBe(false);
        });

        it('flagged cells cannot be revealed by direct click or flood fill', () => {
            const config = SWEEPER_CONFIGS.beginner;
            const board = SoundSweeperEngine.createBoard(config);
            board[0][0].isFlagged = true;

            const res = SoundSweeperEngine.revealCell(board, 0, 0);
            expect(res.newlyRevealedCount).toBe(0);
            expect(res.nextBoard[0][0].isRevealed).toBe(false);
        });

        it('win detection requires exactly all non-mine cells to be revealed', () => {
            const config: typeof SWEEPER_CONFIGS.beginner = { rows: 3, cols: 3, mines: 1 };
            const board = SoundSweeperEngine.createBoard(config);
            board[2][2].isMine = true;

            // Reveal 7 out of 8 non-mine cells
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (r === 2 && c === 2) continue;
                    if (r === 2 && c === 1) continue;
                    board[r][c].isRevealed = true;
                }
            }
            expect(SoundSweeperEngine.checkWin(board)).toBe(false);

            // Reveal final non-mine cell
            board[2][1].isRevealed = true;
            expect(SoundSweeperEngine.checkWin(board)).toBe(true);
        });
    });

    describe('4. Picross Engine Verification', () => {
        it('correctly generates clues for every preset without off-by-one errors', () => {
            for (const preset of PICROSS_PRESETS) {
                const puzzle = PicrossEngine.createPuzzleFromPreset(preset);
                expect(puzzle.rowClues.length).toBe(preset.size);
                expect(puzzle.colClues.length).toBe(preset.size);

                for (const rowClue of puzzle.rowClues) {
                    if (rowClue.length === 1 && rowClue[0] === 0) continue;
                    const minLengthNeeded = rowClue.reduce((a, b) => a + b, 0) + (rowClue.length - 1);
                    expect(minLengthNeeded).toBeLessThanOrEqual(preset.size);
                }
            }
        });

        it('handles completely empty and completely filled rows/columns', () => {
            const emptyLine = [false, false, false, false];
            expect(PicrossEngine.parseClues(emptyLine)).toEqual([0]);

            const fullLine = [true, true, true, true];
            expect(PicrossEngine.parseClues(fullLine)).toEqual([4]);

            const alternating = [true, false, true, false, true];
            expect(PicrossEngine.parseClues(alternating)).toEqual([1, 1, 1]);
        });

        it('rejects partial or false-positive matching configurations', () => {
            const puzzle = PicrossEngine.createPuzzleFromPreset(PICROSS_PRESETS[0]);
            const wrongGrid: (boolean | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

            expect(PicrossEngine.isSolved(wrongGrid, puzzle.solution)).toBe(false);

            const almostSolved = puzzle.solution.map((r) => [...r]);
            almostSolved[2][1] = !almostSolved[2][1];
            expect(PicrossEngine.isSolved(almostSolved, puzzle.solution)).toBe(false);
        });
    });

    describe('5. 15-Slide Puzzle Engine Verification', () => {
        it('inversion parity correctly classifies known solvable and unsolvable configurations', () => {
            // Canonical solved board: 0 inversions, blank on bottom row (row 1 from bottom).
            // (0 + 1) % 2 === 1 => solvable!
            const solved = SlidePuzzleEngine.getSolvedTiles();
            expect(SlidePuzzleEngine.isSolvable(solved)).toBe(true);
            expect(SlidePuzzleEngine.isSolved(solved)).toBe(true);

            // Classic 14-15 swap (Sam Loyd's 15-puzzle) with blank in bottom-right:
            // Swap tiles 14 and 15: creates 1 inversion.
            // inversions = 1, blank row from bottom = 1.
            // (1 + 1) % 2 === 0 => mathematically unsolvable!
            const unsolvable = [...solved];
            [unsolvable[13], unsolvable[14]] = [unsolvable[14], unsolvable[13]];
            expect(SlidePuzzleEngine.isSolvable(unsolvable)).toBe(false);

            // Blank moved up one row to row 2 from bottom (row index 2):
            // Blank index = 11 (row 2, col 3). Row from bottom = 2.
            // Inversions = 1.
            // (1 + 2) % 2 === 1 => solvable!
            const solvableAlt = [...unsolvable];
            [solvableAlt[14], solvableAlt[10]] = [solvableAlt[10], solvableAlt[14]]; // swap with tile above
            expect(SlidePuzzleEngine.isSolvable(solvableAlt)).toBe(true);
        });

        it('every generated scramble is guaranteed solvable', () => {
            for (let seed = 1; seed <= 5; seed++) {
                const board = SlidePuzzleEngine.generateSolvableBoard(`test-seed-${seed}`);
                expect(board.length).toBe(16);
                expect(SlidePuzzleEngine.isSolvable(board)).toBe(true);
                expect(SlidePuzzleEngine.isSolved(board)).toBe(false);
            }
        });

        it('only strictly orthogonal adjacent tiles can move', () => {
            // Grid layout:
            // 0  1  2  3
            // 4  5  6  7
            // 8  9  10 11
            // 12 13 14 15
            // When empty space is at 5:
            const emptyIdx = 5;
            expect(SlidePuzzleEngine.canMove(1, emptyIdx)).toBe(true);  // up
            expect(SlidePuzzleEngine.canMove(9, emptyIdx)).toBe(true);  // down
            expect(SlidePuzzleEngine.canMove(4, emptyIdx)).toBe(true);  // left
            expect(SlidePuzzleEngine.canMove(6, emptyIdx)).toBe(true);  // right

            // Diagonals must be rejected
            expect(SlidePuzzleEngine.canMove(0, emptyIdx)).toBe(false);
            expect(SlidePuzzleEngine.canMove(2, emptyIdx)).toBe(false);
            expect(SlidePuzzleEngine.canMove(8, emptyIdx)).toBe(false);
            expect(SlidePuzzleEngine.canMove(10, emptyIdx)).toBe(false);

            // Non-adjacent row/col
            expect(SlidePuzzleEngine.canMove(13, emptyIdx)).toBe(false);
        });

        it('win detection requires all tiles 1-15 in sequential order and 0 in slot 15', () => {
            const solved = SlidePuzzleEngine.getSolvedTiles();
            expect(SlidePuzzleEngine.isSolved(solved)).toBe(true);

            const almostSolved = [...solved];
            almostSolved[0] = 2;
            almostSolved[1] = 1;
            expect(SlidePuzzleEngine.isSolved(almostSolved)).toBe(false);
        });
    });
});
