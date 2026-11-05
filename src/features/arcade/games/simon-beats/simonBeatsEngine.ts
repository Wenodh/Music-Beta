export type PadColor = 'green' | 'red' | 'yellow' | 'blue';

export const PADS: { color: PadColor; freq: number; bgClass: string; activeClass: string }[] = [
    { color: 'green', freq: 261.63, bgClass: 'bg-emerald-600', activeClass: 'bg-emerald-400 shadow-[0_0_20px_#10b981]' },
    { color: 'red', freq: 329.63, bgClass: 'bg-rose-600', activeClass: 'bg-rose-400 shadow-[0_0_20px_#f43f5e]' },
    { color: 'yellow', freq: 392.00, bgClass: 'bg-amber-600', activeClass: 'bg-amber-400 shadow-[0_0_20px_#f59e0b]' },
    { color: 'blue', freq: 523.25, bgClass: 'bg-cyan-600', activeClass: 'bg-cyan-400 shadow-[0_0_20px_#06b6d4]' },
];

export class SimonBeatsEngine {
    static generateNextStep(sequence: PadColor[]): PadColor[] {
        const colors: PadColor[] = ['green', 'red', 'yellow', 'blue'];
        const next = colors[Math.floor(Math.random() * colors.length)];
        return [...sequence, next];
    }

    static verifyInput(sequence: PadColor[], inputIndex: number, color: PadColor): boolean {
        if (inputIndex < 0 || inputIndex >= sequence.length) return false;
        return sequence[inputIndex] === color;
    }
}
