import { playbackManager } from '../playback/PlaybackManager';
import { Command, CommandPayload } from './types';
import { eventBus, Events } from '../events';

export class CommandDispatcher {
    private static instance: CommandDispatcher;

    private constructor() {}

    public static getInstance(): CommandDispatcher {
        if (!CommandDispatcher.instance) {
            CommandDispatcher.instance = new CommandDispatcher();
        }
        return CommandDispatcher.instance;
    }

    public async dispatch(command: Command, payload?: CommandPayload) {
        logger.debug(`[CommandDispatcher] Dispatching command: ${command}`, payload);

        switch (command) {
            case 'play':
                if (payload?.itemId && playbackManager.currentMediaItem?.id !== payload.itemId) {
                    // Logic to fetch and play item if needed,
                    // but usually UI or PlaybackManager handles the item transition.
                    // For now, assume it's just resume if no itemId or same itemId.
                    await playbackManager.play(playbackManager.currentMediaItem!);
                } else {
                    await playbackManager.play(playbackManager.currentMediaItem!);
                }
                break;
            case 'pause':
                playbackManager.pause();
                break;
            case 'togglePlay':
                if (playbackManager.state === 'playing') {
                    playbackManager.pause();
                } else {
                    await playbackManager.play(playbackManager.currentMediaItem!);
                }
                break;
            case 'next':
                eventBus.emit('COMMAND_NEXT');
                break;
            case 'previous':
                eventBus.emit('COMMAND_PREVIOUS');
                break;
            case 'seek':
                if (payload?.value !== undefined) {
                    if (payload.isRelative) {
                        eventBus.emit('COMMAND_SEEK_RELATIVE', payload.value);
                    } else {
                        playbackManager.seek(payload.value);
                    }
                }
                break;
            case 'volume':
                if (payload?.value !== undefined) {
                    playbackManager.setVolume(payload.value);
                }
                break;
            case 'favorite':
                eventBus.emit('COMMAND_FAVORITE', payload?.itemId || playbackManager.currentMediaItem?.id);
                break;
            case 'download':
                eventBus.emit('COMMAND_DOWNLOAD', payload?.itemId || playbackManager.currentMediaItem?.id);
                break;
            case 'playbackRate':
                if (payload?.value !== undefined) {
                    playbackManager.setPlaybackSpeed(payload.value);
                }
                break;
            default:
                logger.warn(`[CommandDispatcher] Unknown command: ${command}`);
        }
    }

    private setupEventListeners() {
        eventBus.on('COMMAND_SEEK_RELATIVE', (offset: number) => {
            const currentTime = playbackManager.currentTime;
            const duration = playbackManager.duration;
            const newTime = Math.max(0, Math.min(duration, currentTime + offset));
            playbackManager.seek(newTime);
        });
    }

    public initialize() {
        this.setupEventListeners();
    }
}

export const commandDispatcher = CommandDispatcher.getInstance();
