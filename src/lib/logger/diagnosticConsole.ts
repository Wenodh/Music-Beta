export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export interface LogEntry { id: number; timestamp: string; level: LogLevel; message: string; }

const KEY = 'vibeon:diagnostic-console:v1';
const LIMIT = 500;
let entries: LogEntry[] = [];
let id = 1;
let installed = false;
const listeners = new Set<() => void>();

const clean = (value: string) => value
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, '$1[REDACTED]')
    .replace(/((?:access_token|refresh_token|password|authorization|apikey|api_key)\s*[:=]\s*)["']?[^\s,"'}]+/gi, '$1[REDACTED]')
    .replace(/([?&](?:token|access_token|api_key|apikey)=)[^&\s]+/gi, '$1[REDACTED]');
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]');

const stringify = (value: unknown): string => {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'string') return value;
    try {
        const seen = new WeakSet<object>();
        return JSON.stringify(value, (_key, item) => {
            if (item && typeof item === 'object') {
                if (seen.has(item)) return '[Circular]';
                seen.add(item);
            }
            if (item instanceof Error) return { name: item.name, message: item.message, stack: item.stack };
            return item;
        });
    } catch { return String(value); }
};

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* Storage unavailable/full. */ } };
const emit = () => listeners.forEach((listener) => listener());
const append = (level: LogLevel, args: unknown[]) => {
    entries.push({ id: id++, timestamp: new Date().toISOString(), level, message: clean(args.map(stringify).join(' ').slice(0, 5000)) });
    if (entries.length > LIMIT) entries = entries.slice(-LIMIT);
    save();
    emit();
};

const load = () => {
    try {
        const saved = localStorage.getItem(KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) entries = parsed.slice(-LIMIT).filter((x) =>
            x && typeof x.timestamp === 'string' && typeof x.message === 'string' &&
            ['log', 'info', 'warn', 'error', 'debug'].includes(x.level));
        id = entries.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0) + 1;
    } catch { entries = []; }
};

export const diagnosticConsole = {
    getEntries: () => entries.slice(),
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    clear: () => { entries = []; save(); emit(); },
    copyText: () => entries.map((x) => '[' + x.timestamp + '] [' + x.level.toUpperCase() + '] ' + x.message).join('\n'),
    install: () => {
        if (installed || typeof window === 'undefined') return;
        installed = true;
        load();
        (['log', 'info', 'warn', 'error', 'debug'] as LogLevel[]).forEach((level) => {
            const original = console[level].bind(console);
            console[level] = (...args: unknown[]) => { append(level, args); original(...args); };
        });
        window.addEventListener('error', (event) => append('error', ['[window.error]', event.message, event.filename, event.lineno, event.colno, event.error]));
        window.addEventListener('unhandledrejection', (event) => append('error', ['[unhandledrejection]', event.reason]));
        append('info', ['Diagnostic console initialized', { userAgent: navigator.userAgent, platform: navigator.platform }]);
    },
};
