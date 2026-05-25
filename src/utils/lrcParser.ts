export interface LyricLine {
    time: number;
    text: string;
}

export const parseLRC = (lrc: string): LyricLine[] => {
    const lines = lrc.split('\n');
    const lyrics: LyricLine[] = [];
    // Enhanced regex to handle multiple time tags on one line and different formats
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    lines.forEach(line => {
        const lineTimeMatches = [...line.matchAll(timeRegex)];
        if (lineTimeMatches.length > 0) {
            const text = line.replace(timeRegex, '').trim();

            if (text) {
                lineTimeMatches.forEach(match => {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const msStr = match[3];
                    const milliseconds = parseInt(msStr);

                    // Handle both .xx and .xxx milliseconds correctly
                    const time = minutes * 60 + seconds + (msStr.length === 2 ? milliseconds / 100 : milliseconds / 1000);
                    lyrics.push({ time, text });
                });
            }
        }
    });

    return lyrics.sort((a, b) => a.time - b.time);
};

export const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
