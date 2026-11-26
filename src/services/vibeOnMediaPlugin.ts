import { registerPlugin } from '@capacitor/core';

// Keep one JS proxy for the native plugin. Registering this plugin separately
// in both playback and calling services causes Capacitor duplicate-registration warnings.
export const VibeOnMedia = registerPlugin<any>('VibeOnMedia');
