/**
 * Persistent Audio Manager for WebRTC Calls
 * Ensures audio elements survive React re-renders, prevents garbage collection,
 * unlocks audio autoplay, and routes audio streams reliably.
 */
class PersistentAudioManager {
    private audioElement: HTMLAudioElement | null = null;

    private getOrCreateAudio(): HTMLAudioElement {
        if (!this.audioElement) {
            const audio = document.createElement('audio');
            audio.id = 'vibeon-webrtc-remote-audio';
            audio.autoplay = true;
            (audio as any).playsInline = true;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            this.audioElement = audio;
        }
        return this.audioElement;
    }

    public attachStream(stream: MediaStream): void {
        const audio = this.getOrCreateAudio();
        if (audio.srcObject !== stream) {
            audio.srcObject = stream;
        }
        audio.play().catch((err) => {
            console.warn('[PersistentAudioManager] Autoplay blocked, unlocking on user gesture:', err);
            const unlock = () => {
                audio.play().catch((e) => console.error('[PersistentAudioManager] Unlock play error:', e));
                window.removeEventListener('click', unlock);
                window.removeEventListener('touchstart', unlock);
            };
            window.addEventListener('click', unlock, { once: true });
            window.addEventListener('touchstart', unlock, { once: true });
        });
    }

    public setVolume(volume: number): void {
        if (this.audioElement) {
            this.audioElement.volume = Math.max(0, Math.min(1, volume));
        }
    }

    public async setSinkId(sinkId: string): Promise<boolean> {
        const audio = this.getOrCreateAudio();
        if ('setSinkId' in audio && typeof (audio as any).setSinkId === 'function') {
            try {
                await (audio as any).setSinkId(sinkId);
                return true;
            } catch (err) {
                console.warn('[PersistentAudioManager] setSinkId failed:', err);
                return false;
            }
        }
        return false;
    }

    public stop(): void {
        if (this.audioElement) {
            try {
                this.audioElement.pause();
                this.audioElement.srcObject = null;
            } catch (e) {
                console.warn('[PersistentAudioManager] Error stopping audio:', e);
            }
        }
    }
}

export const persistentAudioManager = new PersistentAudioManager();
