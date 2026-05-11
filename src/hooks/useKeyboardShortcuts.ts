import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { togglePlay, nextSong, prevSong } from '../features/musicplayer/musicPlayerSlice';
import { setSettingsOpen, setQueueOpen } from '../features/musicplayer/musicPlayerSlice';

export const useKeyboardShortcuts = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          dispatch(togglePlay());
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            dispatch(nextSong());
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            dispatch(prevSong());
          }
          break;
        case 'q':
        case 'Q':
          dispatch(setQueueOpen(true));
          break;
        case 's':
        case 'S':
          dispatch(setSettingsOpen(true));
          break;
        case 'Escape':
          dispatch(setSettingsOpen(false));
          dispatch(setQueueOpen(false));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);
};
