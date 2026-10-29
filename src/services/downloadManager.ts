import { Song } from '../types/music';
import { saveSongOffline, getDownloadedSongIds, deleteOfflineSong } from '../utils/db';
import { extractImageUrl } from '../utils/imageUtils';

export type DownloadJobStatus =
    | 'idle'
    | 'waiting'
    | 'downloading'
    | 'paused'
    | 'completed'
    | 'failed';

export interface DownloadJob {
    id: string; // Song ID
    song: Song;
    status: DownloadJobStatus;
    progress: number; // 0 to 100
    loadedBytes: number;
    totalBytes: number;
    error?: string;
    qualityUsed?: string;
    addedAt: number;
    completedAt?: number;
    retryCount: number;
}

export interface DownloadSummary {
    total: number;
    completed: number;
    failed: number;
    downloading: number;
    waiting: number;
    paused: number;
    isPausedForWifi: boolean;
    totalBytesDownloaded: number;
}

export type DownloadManagerListener = (jobs: DownloadJob[], summary: DownloadSummary) => void;

const QUEUE_STORAGE_KEY = 'vibeon_download_queue_v1';
const QUALITY_ORDER = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];

export class DownloadManagerService {
    private jobs: Map<string, DownloadJob> = new Map();
    private activeControllers: Map<string, AbortController> = new Map();
    private maxConcurrency = 2;
    private wifiOnly = false;
    private preferredQuality = '320kbps';
    private listeners: Set<DownloadManagerListener> = new Set();
    private isProcessing = false;
    private onSongDownloadedCallback?: (songId: string) => void;

    constructor() {
        this.loadPersistedQueue();
        this.setupNetworkListeners();
    }

    /**
     * Initializes the download manager and reconciles queue state with IndexedDB.
     */
    public async init(onSongDownloaded?: (songId: string) => void): Promise<void> {
        this.onSongDownloadedCallback = onSongDownloaded;

        try {
            const downloadedIds = new Set(await getDownloadedSongIds());

            // Reconcile jobs
            for (const [id, job] of Array.from(this.jobs.entries())) {
                if (downloadedIds.has(id)) {
                    job.status = 'completed';
                    job.progress = 100;
                } else if (job.status === 'downloading') {
                    // Reset downloading jobs on restart
                    job.status = 'waiting';
                    job.progress = 0;
                    job.loadedBytes = 0;
                }
            }

            this.persistQueue();
            this.notifyListeners();
            this.processQueue();
        } catch (err) {
            console.error('Failed to initialize DownloadManagerService:', err);
        }
    }

    public setOnSongDownloaded(cb: (songId: string) => void): void {
        this.onSongDownloadedCallback = cb;
    }

    public setWifiOnly(wifiOnly: boolean): void {
        this.wifiOnly = wifiOnly;
        if (wifiOnly && this.isCellularOrOffline()) {
            this.pauseQueueForWifi();
        } else {
            this.resumeQueueFromWifi();
        }
    }

    public setPreferredQuality(quality: string): void {
        this.preferredQuality = quality;
    }

    public setMaxConcurrency(concurrency: number): void {
        this.maxConcurrency = Math.max(1, concurrency);
        this.processQueue();
    }

    /**
     * Resolves the best audio URL and quality for a song given preferred quality.
     */
    public resolveAudioUrl(song: Song, preferredQuality: string = this.preferredQuality): { url: string; quality: string } | null {
        const musicData = song.downloadUrl || song.music;

        if (Array.isArray(musicData) && musicData.length > 0) {
            // Find exact match first
            const exact = musicData.find((d: any) => d.quality === preferredQuality);
            if (exact && exact.url) {
                return { url: exact.url, quality: exact.quality };
            }

            // Find closest available quality
            const prefIndex = QUALITY_ORDER.indexOf(preferredQuality);
            let bestMatch = musicData[musicData.length - 1]; // Default to highest

            if (prefIndex !== -1) {
                // Find closest quality in order
                let minDiff = Infinity;
                for (const item of musicData) {
                    const itemIdx = QUALITY_ORDER.indexOf(item.quality);
                    if (itemIdx !== -1) {
                        const diff = Math.abs(itemIdx - prefIndex);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestMatch = item;
                        }
                    }
                }
            }

            if (bestMatch && bestMatch.url) {
                return { url: bestMatch.url, quality: bestMatch.quality || preferredQuality };
            }
        }

        if (typeof musicData === 'string' && musicData.trim()) {
            return { url: musicData, quality: preferredQuality };
        }

        return null;
    }

    /**
     * Enqueues a single song for downloading.
     */
    public async enqueueSong(song: Song, qualityOverride?: string): Promise<boolean> {
        if (!song || !song.id) return false;

        // Deduplication: Check if already downloaded in IndexedDB
        const downloadedIds = new Set(await getDownloadedSongIds());
        if (downloadedIds.has(song.id)) {
            // Ensure Redux and local state know it's downloaded
            if (this.onSongDownloadedCallback) {
                this.onSongDownloadedCallback(song.id);
            }
            return false;
        }

        const existingJob = this.jobs.get(song.id);
        if (existingJob) {
            if (existingJob.status === 'completed') {
                return false;
            }
            if (existingJob.status === 'failed') {
                existingJob.status = 'waiting';
                existingJob.error = undefined;
                existingJob.retryCount = 0;
                this.persistQueue();
                this.notifyListeners();
                this.processQueue();
                return true;
            }
            // Already queued or downloading
            return false;
        }

        const job: DownloadJob = {
            id: song.id,
            song,
            status: 'waiting',
            progress: 0,
            loadedBytes: 0,
            totalBytes: 0,
            qualityUsed: qualityOverride || this.preferredQuality,
            addedAt: Date.now(),
            retryCount: 0,
        };

        this.jobs.set(song.id, job);
        this.persistQueue();
        this.notifyListeners();
        this.processQueue();
        return true;
    }

    /**
     * Enqueues multiple songs for bulk downloading.
     */
    public async enqueueSongs(songs: Song[], qualityOverride?: string): Promise<{ added: number; skipped: number }> {
        const downloadedIds = new Set(await getDownloadedSongIds());
        let added = 0;
        let skipped = 0;

        for (const song of songs) {
            if (!song || !song.id) continue;

            if (downloadedIds.has(song.id)) {
                skipped++;
                continue;
            }

            const existingJob = this.jobs.get(song.id);
            if (existingJob) {
                if (existingJob.status === 'completed') {
                    skipped++;
                } else if (existingJob.status === 'failed') {
                    existingJob.status = 'waiting';
                    existingJob.error = undefined;
                    existingJob.retryCount = 0;
                    added++;
                } else {
                    skipped++;
                }
            } else {
                this.jobs.set(song.id, {
                    id: song.id,
                    song,
                    status: 'waiting',
                    progress: 0,
                    loadedBytes: 0,
                    totalBytes: 0,
                    qualityUsed: qualityOverride || this.preferredQuality,
                    addedAt: Date.now(),
                    retryCount: 0,
                });
                added++;
            }
        }

        this.persistQueue();
        this.notifyListeners();
        this.processQueue();

        return { added, skipped };
    }

    /**
     * Cancels a specific download job.
     */
    public cancelJob(songId: string): void {
        const controller = this.activeControllers.get(songId);
        if (controller) {
            controller.abort();
            this.activeControllers.delete(songId);
        }

        this.jobs.delete(songId);
        this.persistQueue();
        this.notifyListeners();
        this.processQueue();
    }

    /**
     * Cancels all queued and active downloads without deleting completed ones.
     */
    public cancelQueue(): void {
        for (const [id, controller] of Array.from(this.activeControllers.entries())) {
            controller.abort();
        }
        this.activeControllers.clear();

        for (const [id, job] of Array.from(this.jobs.entries())) {
            if (job.status !== 'completed') {
                this.jobs.delete(id);
            }
        }

        this.persistQueue();
        this.notifyListeners();
    }

    /**
     * Retries a failed download job.
     */
    public retryJob(songId: string): void {
        const job = this.jobs.get(songId);
        if (job && (job.status === 'failed' || job.status === 'paused')) {
            job.status = 'waiting';
            job.error = undefined;
            job.retryCount = 0;
            this.persistQueue();
            this.notifyListeners();
            this.processQueue();
        }
    }

    /**
     * Retries all failed download jobs in the queue.
     */
    public retryFailed(): void {
        let count = 0;
        for (const job of Array.from(this.jobs.values())) {
            if (job.status === 'failed') {
                job.status = 'waiting';
                job.error = undefined;
                job.retryCount = 0;
                count++;
            }
        }
        if (count > 0) {
            this.persistQueue();
            this.notifyListeners();
            this.processQueue();
        }
    }

    /**
     * Removes local audio and cover artwork for a song without removing the favorite from Supabase.
     */
    public async removeDownloadedSong(songId: string): Promise<void> {
        await deleteOfflineSong(songId);
        this.jobs.delete(songId);
        this.persistQueue();
        this.notifyListeners();
    }

    public getJobs(): DownloadJob[] {
        return Array.from(this.jobs.values());
    }

    public getJob(songId: string): DownloadJob | undefined {
        return this.jobs.get(songId);
    }

    public getSummary(): DownloadSummary {
        const jobsList = Array.from(this.jobs.values());
        let completed = 0;
        let failed = 0;
        let downloading = 0;
        let waiting = 0;
        let paused = 0;
        let totalBytesDownloaded = 0;

        for (const job of jobsList) {
            if (job.status === 'completed') {
                completed++;
                totalBytesDownloaded += job.totalBytes || job.loadedBytes || 0;
            } else if (job.status === 'failed') {
                failed++;
            } else if (job.status === 'downloading') {
                downloading++;
            } else if (job.status === 'waiting') {
                waiting++;
            } else if (job.status === 'paused') {
                paused++;
            }
        }

        return {
            total: jobsList.length,
            completed,
            failed,
            downloading,
            waiting,
            paused,
            isPausedForWifi: this.wifiOnly && this.isCellularOrOffline(),
            totalBytesDownloaded,
        };
    }

    public subscribe(listener: DownloadManagerListener): () => void {
        this.listeners.add(listener);
        listener(this.getJobs(), this.getSummary());
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        const jobs = this.getJobs();
        const summary = this.getSummary();
        this.listeners.forEach(fn => fn(jobs, summary));
    }

    private persistQueue(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            const queueToSave = Array.from(this.jobs.values()).map(job => ({
                id: job.id,
                song: job.song,
                status: job.status === 'downloading' ? 'waiting' : job.status,
                progress: job.status === 'completed' ? 100 : 0,
                loadedBytes: job.loadedBytes,
                totalBytes: job.totalBytes,
                error: job.error,
                qualityUsed: job.qualityUsed,
                addedAt: job.addedAt,
                completedAt: job.completedAt,
                retryCount: job.retryCount,
            }));
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueToSave));
        } catch (e) {
            console.warn('Failed to persist download queue to localStorage', e);
        }
    }

    private loadPersistedQueue(): void {
        if (typeof localStorage === 'undefined') return;
        try {
            const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
            if (stored) {
                const parsed: DownloadJob[] = JSON.parse(stored);
                for (const item of parsed) {
                    if (item && item.id && item.song) {
                        this.jobs.set(item.id, item);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to load persisted download queue', e);
        }
    }

    private isCellularOrOffline(): boolean {
        if (typeof navigator === 'undefined' || !navigator.onLine) return true;
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
            const type = conn.type;
            const effectiveType = conn.effectiveType;
            if (type === 'cellular') return true;
            if (['slow-2g', '2g', '3g'].includes(effectiveType)) return true;
        }
        return false;
    }

    private setupNetworkListeners(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            if (!this.wifiOnly || !this.isCellularOrOffline()) {
                this.resumeQueueFromWifi();
            }
        });

        window.addEventListener('offline', () => {
            this.pauseQueueForWifi();
        });

        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
            conn.addEventListener('change', () => {
                if (this.wifiOnly && this.isCellularOrOffline()) {
                    this.pauseQueueForWifi();
                } else if (!this.wifiOnly || !this.isCellularOrOffline()) {
                    this.resumeQueueFromWifi();
                }
            });
        }
    }

    private pauseQueueForWifi(): void {
        for (const job of Array.from(this.jobs.values())) {
            if (job.status === 'waiting' || job.status === 'downloading') {
                if (job.status === 'downloading') {
                    const controller = this.activeControllers.get(job.id);
                    if (controller) controller.abort();
                    this.activeControllers.delete(job.id);
                }
                job.status = 'paused';
                job.error = 'Paused: Waiting for Wi-Fi connection';
            }
        }
        this.notifyListeners();
    }

    private resumeQueueFromWifi(): void {
        for (const job of Array.from(this.jobs.values())) {
            if (job.status === 'paused' && job.error?.includes('Waiting for Wi-Fi')) {
                job.status = 'waiting';
                job.error = undefined;
            }
        }
        this.notifyListeners();
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (this.wifiOnly && this.isCellularOrOffline()) {
                this.pauseQueueForWifi();
                this.isProcessing = false;
                return;
            }

            const activeCount = this.activeControllers.size;
            if (activeCount >= this.maxConcurrency) {
                this.isProcessing = false;
                return;
            }

            const waitingJobs = Array.from(this.jobs.values()).filter(j => j.status === 'waiting');
            const slotsAvailable = this.maxConcurrency - activeCount;

            const jobsToStart = waitingJobs.slice(0, slotsAvailable);

            for (const job of jobsToStart) {
                this.startJob(job);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private async startJob(job: DownloadJob): Promise<void> {
        job.status = 'downloading';
        job.progress = 0;
        job.error = undefined;

        const controller = new AbortController();
        this.activeControllers.set(job.id, controller);

        this.notifyListeners();

        try {
            await this.executeDownloadWithRetry(job, controller.signal);
            job.status = 'completed';
            job.progress = 100;
            job.completedAt = Date.now();
            this.activeControllers.delete(job.id);

            // Save to IndexedDB
            this.persistQueue();
            this.notifyListeners();

            if (this.onSongDownloadedCallback) {
                this.onSongDownloadedCallback(job.id);
            }
        } catch (err: any) {
            this.activeControllers.delete(job.id);

            if (controller.signal.aborted) {
                // Job was intentionally canceled
                return;
            }

            job.status = 'failed';
            job.error = err?.message || 'Download failed';
            this.persistQueue();
            this.notifyListeners();
        } finally {
            // Process remaining items in queue
            this.processQueue();
        }
    }

    private async executeDownloadWithRetry(job: DownloadJob, signal: AbortSignal): Promise<void> {
        const maxRetries = 3;
        let attempt = 0;
        let lastError: any = null;

        while (attempt <= maxRetries) {
            if (signal.aborted) throw new Error('Aborted');

            try {
                await this.downloadSongBlobs(job, signal);
                return; // Success
            } catch (err: any) {
                if (signal.aborted) throw new Error('Aborted');
                lastError = err;
                attempt++;
                job.retryCount = attempt;

                // Permanent errors (e.g. 404 / 403 or invalid stream URL) should fail immediately
                if (err?.message?.includes('404') || err?.message?.includes('403') || err?.message?.includes('No valid audio URL')) {
                    throw err;
                }

                if (attempt <= maxRetries) {
                    const backoffMs = Math.pow(2, attempt) * 500 + Math.random() * 200;
                    job.error = `Retrying (${attempt}/${maxRetries})...`;
                    this.notifyListeners();
                    await new Promise(res => setTimeout(res, backoffMs));
                }
            }
        }

        throw lastError || new Error('Failed after retries');
    }

    private async downloadSongBlobs(job: DownloadJob, signal: AbortSignal): Promise<void> {
        const resolved = this.resolveAudioUrl(job.song, job.qualityUsed);
        if (!resolved || !resolved.url) {
            throw new Error('No valid audio URL available for this song');
        }

        const audioUrl = resolved.url;
        job.qualityUsed = resolved.quality;

        // 1. Fetch Audio Blob with progress
        const audioResponse = await fetch(audioUrl, { signal });
        if (!audioResponse.ok) {
            throw new Error(`HTTP Error ${audioResponse.status}: ${audioResponse.statusText}`);
        }

        const contentLengthHeader = audioResponse.headers.get('content-length');
        const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
        job.totalBytes = totalBytes;

        const reader = audioResponse.body?.getReader();
        const chunks: Uint8Array[] = [];
        let loadedBytes = 0;

        if (reader) {
            while (true) {
                if (signal.aborted) throw new Error('Aborted');
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    loadedBytes += value.length;
                    job.loadedBytes = loadedBytes;
                    if (totalBytes > 0) {
                        job.progress = Math.min(99, Math.round((loadedBytes / totalBytes) * 100));
                    } else {
                        // Indeterminate calculation
                        job.progress = Math.min(95, Math.round((loadedBytes / (1024 * 1024 * 3)) * 100));
                    }
                    this.notifyListeners();
                }
            }
        } else {
            const blob = await audioResponse.blob();
            chunks.push(new Uint8Array(await blob.arrayBuffer()));
            loadedBytes = blob.size;
            job.loadedBytes = loadedBytes;
            job.totalBytes = loadedBytes;
            job.progress = 99;
        }

        const audioBlob = new Blob(chunks, { type: audioResponse.headers.get('content-type') || 'audio/mpeg' });

        // Validate audio blob size
        if (audioBlob.size === 0) {
            throw new Error('Downloaded audio file is empty or corrupted');
        }

        // 2. Fetch Image Blob
        const imageUrl = extractImageUrl(job.song as any);
        let imageBlob = new Blob();

        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl, { signal });
                if (imgRes.ok) {
                    imageBlob = await imgRes.blob();
                }
            } catch (e) {
                // Image failure shouldn't abort audio download
                console.warn('Failed to fetch artwork image blob, using fallback', e);
            }
        }

        // 3. Atomically Save to IndexedDB
        await saveSongOffline(job.song, audioBlob, imageBlob, job.qualityUsed);
    }
}

export const downloadManager = new DownloadManagerService();
