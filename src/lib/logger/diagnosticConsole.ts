import { diagnosticSettings } from './diagnosticSettings';
import packageJson from '../../../package.json';

const APP_VERSION = packageJson.version;

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export interface LogEntry { id: number; timestamp: string; level: LogLevel; message: string; }

const KEY = 'vibeon:diagnostic-console:v1';
const LIMIT = 500;
let entries: LogEntry[] = [];
let id = 1;
let installed = false;
const listeners = new Set<() => void>();

const clean = (value: string) => value
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/((?:access_token|refresh_token|password|authorization|apikey|api_key)\s*[:=]\s*)["']?[^\s,"'}]+/gi, '$1[REDACTED]')
    .replace(/([?&](?:token|access_token|api_key|apikey)=)[^&\s]+/gi, '$1[REDACTED]')
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
const formatIstTimestamp = (date: Date): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? '00';
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}.${String(date.getMilliseconds()).padStart(3, '0')}+05:30`;
};

const append = (level: LogLevel, args: unknown[]) => {
    const message = clean(`[Vibe On v${APP_VERSION}] ${args.map(stringify).join(' ')}`.slice(0, 5000));
    const settings = diagnosticSettings.get();
    // Always retain errors for support. Other diagnostic collection is user-controlled.
    if (level !== 'error') {
        if (!settings.enabled) return;
        if (message.includes('[PlaybackTrace]')) {
            if (!settings.playbackTracing) return;
        } else if (!settings.verboseLogging) {
            return;
        }
    }
    entries.push({ id: id++, timestamp: formatIstTimestamp(new Date()), level, message });
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
            ['log', 'info', 'warn', 'error', 'debug'].includes(x.level)).map((x) => ({
                ...x,
                // Convert previously persisted UTC timestamps to IST on load.
                timestamp: Number.isNaN(Date.parse(x.timestamp))
                    ? x.timestamp
                    : formatIstTimestamp(new Date(x.timestamp)),
            }));
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
        append('info', ['Diagnostic console initialized', { appVersion: APP_VERSION, userAgent: navigator.userAgent, platform: navigator.platform, online: navigator.onLine }]);
    },
};
