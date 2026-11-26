export interface DiagnosticSettings {
    enabled: boolean;
    playbackTracing: boolean;
    verboseLogging: boolean;
}

const KEY = 'vibeon:diagnostic-settings:v1';
const DEFAULTS: DiagnosticSettings = {
    enabled: false,
    playbackTracing: false,
    verboseLogging: false,
};

let settings: DiagnosticSettings = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<() => void>();

const load = () => {
    if (loaded || typeof localStorage === 'undefined') return;
    loaded = true;
    try {
        const value = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (value && typeof value === 'object') {
            settings = {
                enabled: value.enabled === true,
                playbackTracing: value.playbackTracing === true,
                verboseLogging: value.verboseLogging === true,
            };
        }
    } catch { settings = { ...DEFAULTS }; }
};

export const diagnosticSettings = {
    get: (): DiagnosticSettings => { load(); return { ...settings }; },
    update: (patch: Partial<DiagnosticSettings>): DiagnosticSettings => {
        load();
        settings = { ...settings, ...patch };
        try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Storage unavailable. */ }
        listeners.forEach((listener) => listener());
        return { ...settings };
    },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
};
