export interface ListeningSessionEvent {
    id: string;
    songId: string;
    songName: string;
    artistName: string;
    albumName?: string;
    imageUrl?: string;
    durationPlayedSeconds: number;
    completionPercentage: number;
    playbackSpeed: number;
    timestamp: number;
}

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

export interface ListeningStatsSummary {
    totalListeningTimeSeconds: number;
    totalTracksPlayed: number;
    topTracks: { songId: string; name: string; artist: string; count: number; playTimeSeconds: number; image?: string }[];
    topArtists: { artist: string; count: number; playTimeSeconds: number }[];
    dailyActivity: { date: string; minutes: number }[];
}

export const calculateListeningStats = (
    events: ListeningSessionEvent[],
    range: AnalyticsTimeRange,
    now = Date.now()
): ListeningStatsSummary => {
    let cutoff = 0;
    if (range === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (range === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (range === '90d') cutoff = now - 90 * 24 * 60 * 60 * 1000;

    const filtered = events.filter(e => e.timestamp >= cutoff);

    let totalListeningTimeSeconds = 0;
    const trackMap = new Map<string, { songId: string; name: string; artist: string; count: number; playTimeSeconds: number; image?: string }>();
    const artistMap = new Map<string, { artist: string; count: number; playTimeSeconds: number }>();
    const dailyMap = new Map<string, number>();

    for (const ev of filtered) {
        // Adjust listened time by playback speed (e.g. 100s audio at 2x takes 50s of real user time)
        const effectiveTime = ev.durationPlayedSeconds / (ev.playbackSpeed || 1.0);
        totalListeningTimeSeconds += effectiveTime;

        // Tracks
        const existingTrack = trackMap.get(ev.songId) || {
            songId: ev.songId,
            name: ev.songName,
            artist: ev.artistName,
            count: 0,
            playTimeSeconds: 0,
            image: ev.imageUrl,
        };
        existingTrack.count += 1;
        existingTrack.playTimeSeconds += effectiveTime;
        trackMap.set(ev.songId, existingTrack);

        // Artists
        const existingArtist = artistMap.get(ev.artistName) || {
            artist: ev.artistName,
            count: 0,
            playTimeSeconds: 0,
        };
        existingArtist.count += 1;
        existingArtist.playTimeSeconds += effectiveTime;
        artistMap.set(ev.artistName, existingArtist);

        // Daily trend
        const dateKey = new Date(ev.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + (effectiveTime / 60));
    }

    const topTracks = Array.from(trackMap.values())
        .sort((a, b) => b.count - a.count || b.playTimeSeconds - a.playTimeSeconds)
        .slice(0, 10);

    const topArtists = Array.from(artistMap.values())
        .sort((a, b) => b.count - a.count || b.playTimeSeconds - a.playTimeSeconds)
        .slice(0, 10);

    const dailyActivity = Array.from(dailyMap.entries()).map(([date, minutes]) => ({
        date,
        minutes: Math.round(minutes),
    }));

    return {
        totalListeningTimeSeconds: Math.round(totalListeningTimeSeconds),
        totalTracksPlayed: filtered.length,
        topTracks,
        topArtists,
        dailyActivity,
    };
};
