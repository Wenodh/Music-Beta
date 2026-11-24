import React, { useCallback, useEffect, useState } from 'react';
import { diagnosticConsole, LogEntry } from '../lib/logger/diagnosticConsole';
import { diagnosticSettings, DiagnosticSettings } from '../lib/logger/diagnosticSettings';
import { IoCopyOutline, IoTrashOutline, IoRefreshOutline } from 'react-icons/io5';

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
    log: 'text-gray-600 dark:text-gray-300',
    info: 'text-sky-600 dark:text-sky-400',
    debug: 'text-violet-600 dark:text-violet-400',
    warn: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
};

const ConsoleLogsPanel: React.FC = () => {
    const [entries, setEntries] = useState<LogEntry[]>(() => diagnosticConsole.getEntries());
    const [level, setLevel] = useState<'all' | LogEntry['level']>('all');
    const [copied, setCopied] = useState(false);
    const [settings, setSettings] = useState<DiagnosticSettings>(() => diagnosticSettings.get());

    useEffect(() => {
        const unsubscribeLogs = diagnosticConsole.subscribe(() => setEntries(diagnosticConsole.getEntries()));
        const unsubscribeSettings = diagnosticSettings.subscribe(() => setSettings(diagnosticSettings.get()));
        return () => { unsubscribeLogs(); unsubscribeSettings(); };
    }, []);

    const updateSetting = (patch: Partial<DiagnosticSettings>) => {
        setSettings(diagnosticSettings.update(patch));
    };

    const handleCopy = useCallback(async () => {
        const text = diagnosticConsole.copyText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            textarea.remove();
            setCopied(success);
        }
    }, []);

    const filtered = level === 'all' ? entries : entries.filter((entry) => entry.level === level);
    const counts = entries.reduce((result, entry) => {
        result[entry.level] += 1;
        return result;
    }, { log: 0, info: 0, debug: 0, warn: 0, error: 0 });

    return (
        <section className="space-y-3" aria-label="Diagnostic console">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-bold text-gray-900 dark:text-white">Diagnostic logging</p><p className="text-[10px] text-gray-500">Master switch for diagnostic collection</p></div>
                    <input aria-label="Diagnostic logging" type="checkbox" checked={settings.enabled} onChange={(e) => updateSetting({ enabled: e.target.checked })} className="h-5 w-5 accent-primary" />
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div><p className="text-xs font-semibold text-gray-900 dark:text-white">Playback tracing</p><p className="text-[10px] text-gray-500">Audio events, source resolution and play/pause traces</p></div>
                    <input aria-label="Playback tracing" type="checkbox" checked={settings.playbackTracing} disabled={!settings.enabled} onChange={(e) => updateSetting({ playbackTracing: e.target.checked })} className="h-4 w-4 accent-primary disabled:opacity-40" />
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div><p className="text-xs font-semibold text-gray-900 dark:text-white">Verbose logging</p><p className="text-[10px] text-gray-500">Additional app info, warnings and debug output</p></div>
                    <input aria-label="Verbose logging" type="checkbox" checked={settings.verboseLogging} disabled={!settings.enabled} onChange={(e) => updateSetting({ verboseLogging: e.target.checked })} className="h-4 w-4 accent-primary disabled:opacity-40" />
                </div>
                <p className="text-[10px] text-gray-500">Settings are saved on this device. Errors are always retained, even when diagnostics are off.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-gray-600 dark:text-gray-300">
                Captures app console output, JavaScript errors and unhandled promise rejections. Keeps the latest 500 entries on this device. Sensitive token-like values are redacted; review logs before sharing.
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
                {(['log', 'info', 'debug', 'warn', 'error'] as const).map((key) => (
                    <button key={key} onClick={() => setLevel(level === key ? 'all' : key)}
                        className={`rounded-lg border px-1 py-2 text-[10px] font-bold ${level === key ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}>
                        <span className={LEVEL_STYLES[key]}>{key.toUpperCase()}</span>
                        <span className="block text-gray-500">{counts[key]}</span>
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <button onClick={handleCopy} disabled={!entries.length}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">
                    <IoCopyOutline size={16} /> {copied ? 'Copied logs' : 'Copy all logs'}
                </button>
                <button onClick={() => setEntries(diagnosticConsole.getEntries())}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 text-gray-600 dark:text-gray-300" aria-label="Refresh logs">
                    <IoRefreshOutline size={17} />
                </button>
                <button onClick={() => { if (window.confirm('Clear all captured logs?')) diagnosticConsole.clear(); }}
                    className="rounded-xl border border-red-200 dark:border-red-900 px-3 text-red-500" aria-label="Clear logs">
                    <IoTrashOutline size={17} />
                </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>{filtered.length} / {entries.length} entries</span>
                <span>Newest entries appear last</span>
            </div>
            <div className="max-h-[48vh] min-h-48 overflow-auto rounded-xl border border-gray-200 bg-gray-950 p-3 font-mono text-[10px] leading-relaxed">
                {filtered.length === 0 ? (
                    <p className="text-gray-500">No logs captured yet.</p>
                ) : filtered.map((entry) => (
                    <div key={entry.id} className="mb-2 break-words border-b border-white/5 pb-2 last:border-0">
                        <div className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                        <div className={LEVEL_STYLES[entry.level]}>[{entry.level.toUpperCase()}] {entry.message}</div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ConsoleLogsPanel;
