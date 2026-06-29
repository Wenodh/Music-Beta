import React, { useState, useEffect } from 'react';
import { PageTemplate } from '../components/PageTemplate';
import { featureFlags, FeatureFlags } from '../lib/feature-flags';
import { logger } from '../lib/logger';
import { providerRegistry } from '../lib/audio-sdk/registry';
import { downloadManager } from '../lib/downloads/DownloadManager';
import { syncManager } from '../lib/sync/SyncManager';
import { db } from '../lib/storage/db';

const Diagnostics: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlags>(featureFlags.getAll());
    const [activeTab, setActiveTab] = useState<'info' | 'flags' | 'logs' | 'performance'>('info');
    const [fps, setFps] = useState(0);

    useEffect(() => {
        let frames = 0;
        let lastTime = performance.now();
        const updateFps = () => {
            frames++;
            const time = performance.now();
            if (time >= lastTime + 1000) {
                setFps(Math.round((frames * 1000) / (time - lastTime)));
                frames = 0;
                lastTime = time;
            }
            requestAnimationFrame(updateFps);
        };
        const handle = requestAnimationFrame(updateFps);
        return () => cancelAnimationFrame(handle);
    }, []);

    const toggleFlag = (key: keyof FeatureFlags) => {
        const newValue = !flags[key];
        featureFlags.setOverride(key, newValue);
        setFlags({ ...flags, [key]: newValue });
    };

    const clearAllData = async () => {
        if (window.confirm('Clear all local data (downloads, sync queue, etc)?')) {
            await db.delete();
            window.location.reload();
        }
    };

    return (
        <PageTemplate title="Developer Diagnostics">
            <div className="mb-8 flex gap-4 overflow-x-auto pb-2">
                {['info', 'flags', 'logs', 'performance'].map((tab: any) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg font-bold capitalize transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-secondary-bg/50 rounded-2xl p-6 border border-white/5">
                {activeTab === 'info' && (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-sm font-bold text-secondary-text uppercase mb-3">System</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoRow label="App Version" value="1.3.1" />
                                <InfoRow label="Environment" value={import.meta.env.MODE} />
                                <InfoRow label="Platform" value={navigator.platform} />
                                <InfoRow label="Online" value={navigator.onLine ? 'Yes' : 'No'} />
                            </div>
                        </section>
                        <section>
                            <h3 className="text-sm font-bold text-secondary-text uppercase mb-3">Managers</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InfoRow label="Providers" value={providerRegistry.listProviders().length.toString()} />
                                <InfoRow label="Downloads" value={downloadManager.getTasks().length.toString()} />
                                <InfoRow label="Sync Queue" value="Unknown" />
                            </div>
                        </section>
                        <div className="pt-4 flex gap-4">
                            <button onClick={clearAllData} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg font-bold hover:bg-red-500/20 transition-colors">
                                Clear Local Data
                            </button>
                            <button onClick={() => logger.exportLogs()} className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold hover:bg-primary/20 transition-colors">
                                Export Logs
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'flags' && (
                    <div className="space-y-2">
                        {Object.entries(flags).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <span className="font-medium">{key}</span>
                                <button
                                    onClick={() => toggleFlag(key as keyof FeatureFlags)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-primary' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-2 font-mono text-xs overflow-y-auto max-h-[500px]">
                        {logger.getMemoryLogs().reverse().map((log, i) => (
                            <div key={i} className={`p-2 rounded border-l-4 ${
                                log.level === 'error' ? 'bg-red-500/10 border-red-500' :
                                log.level === 'warn' ? 'bg-orange-500/10 border-orange-500' :
                                'bg-white/5 border-blue-500'
                            }`}>
                                <div className="flex justify-between opacity-50 mb-1">
                                    <span>{log.category}</span>
                                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div>{log.message}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'performance' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard label="FPS" value={fps} color={fps > 55 ? 'text-green-500' : fps > 30 ? 'text-orange-500' : 'text-red-500'} />
                            <StatCard label="Memory (MB)" value={((performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0).toFixed(1)} />
                        </div>
                    </div>
                )}
            </div>
        </PageTemplate>
    );
};

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
        <span className="text-secondary-text">{label}</span>
        <span className="font-mono font-bold">{value}</span>
    </div>
);

const StatCard = ({ label, value, color = 'text-primary' }: { label: string, value: any, color?: string }) => (
    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
        <div className="text-xs text-secondary-text uppercase mb-1 font-bold">{label}</div>
        <div className={`text-2xl font-black ${color}`}>{value}</div>
    </div>
);

export default Diagnostics;
