import { store } from '../../store';
import { decrementSleepTimer } from '../../features/musicplayer/musicPlayerSlice';

export class SleepTimerService {
    private static instance: SleepTimerService;
    private timerId: ReturnType<typeof setInterval> | null = null;

    private constructor() {
        this.startTimer();
    }

    public static getInstance(): SleepTimerService {
        if (!SleepTimerService.instance) {
            SleepTimerService.instance = new SleepTimerService();
        }
        return SleepTimerService.instance;
    }

    private startTimer() {
        if (this.timerId) return;

        this.timerId = setInterval(() => {
            const { sleepTimer } = store.getState().musicPlayer;
            if (sleepTimer !== null) {
                store.dispatch(decrementSleepTimer());
            }
        }, 60000); // Check every minute
    }

    public stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}

export const sleepTimerService = SleepTimerService.getInstance();
