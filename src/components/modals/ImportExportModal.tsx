import React, { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setImportExportModalOpen, showToast } from '../../features/ui/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IoClose,
    IoCloudUploadOutline,
    IoCloudDownloadOutline,
    IoCheckmarkCircle,
    IoAlertCircle,
    IoSearchOutline,
    IoDocumentTextOutline,
    IoCopyOutline,
    IoRefreshOutline,
    IoListOutline,
    IoOptionsOutline,
    IoTrashOutline,
    IoPlayCircleOutline,
} from 'react-icons/io5';
import { exportToJson } from '../../lib/portability/exporters/jsonExporter';
import { exportToCsv } from '../../lib/portability/exporters/csvExporter';
import { exportToTxt } from '../../lib/portability/exporters/txtExporter';
import { exportToM3u } from '../../lib/portability/exporters/m3uExporter';
import { generateImportPreview, executeImportJob } from '../../lib/portability/orchestrator';
import { ImportPreviewResult, ImportMode, ImportSummary, PortableTrack } from '../../lib/portability/types';
import { Song } from '../../types/music';
import { JioSaavnProviderAdapter } from '../../lib/portability/adapters';

const jiosaavnAdapter = new JioSaavnProviderAdapter();

export const ImportExportModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isImportExportModalOpen } = useAppSelector((state) => state.ui);
    const { favorites, playlists } = useAppSelector((state) => state.library);

    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

    // Export State
    const [exportScope, setExportScope] = useState<'full' | 'favorites' | 'playlist'>('full');
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'm3u8' | 'txt'>('json');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(playlists[0]?.id || '');

    // Import State
    const [importStep, setImportStep] = useState<'select' | 'preview' | 'executing' | 'summary'>('select');
    const [importMode, setImportMode] = useState<ImportMode>('merge');
    const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
    const [importFileContent, setImportFileContent] = useState<string>('');
    const [importFileName, setImportFileName] = useState<string>('');
    const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);

    // Search / Resolution Modal State
    const [resolvingTrackIndex, setResolvingTrackIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [customMatches, setCustomMatches] = useState<Record<number, Song>>({});

    // Import Execution State
    const [importProgress, setImportProgress] = useState(0);
    const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const cancelRef = useRef(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isImportExportModalOpen) return null;

    const handleClose = () => {
        dispatch(setImportExportModalOpen(false));
        resetImportState();
    };

    const resetImportState = () => {
        setImportStep('select');
        setImportFileContent('');
        setImportFileName('');
        setPreviewResult(null);
        setCustomMatches({});
        setImportProgress(0);
        setImportSummary(null);
        setIsCancelling(false);
        cancelRef.current = false;
    };

    // --- Export Handler ---
    const handleExport = () => {
        let content = '';
        let extension = 'json';
        let defaultFileName = 'vibeon_export';

        if (exportScope === 'full') {
            content = exportToJson(favorites, playlists);
            extension = 'json';
            defaultFileName = `vibeon_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
        } else if (exportScope === 'favorites') {
            if (exportFormat === 'csv') {
                content = exportToCsv(favorites, 'Favorites');
                extension = 'csv';
                defaultFileName = `vibeon_favorites_${new Date().toISOString().slice(0, 10)}.csv`;
            } else if (exportFormat === 'txt') {
                content = exportToTxt(favorites);
                extension = 'txt';
                defaultFileName = `vibeon_favorites_${new Date().toISOString().slice(0, 10)}.txt`;
            } else if (exportFormat === 'm3u8') {
                content = exportToM3u(favorites, 'Favorites');
                extension = 'm3u8';
                defaultFileName = `vibeon_favorites_${new Date().toISOString().slice(0, 10)}.m3u8`;
            } else {
                content = exportToJson(favorites, []);
                extension = 'json';
                defaultFileName = `vibeon_favorites_${new Date().toISOString().slice(0, 10)}.json`;
            }
        } else if (exportScope === 'playlist') {
            const playlist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
            const pSongs = playlist?.songs || [];
            const safePName = (playlist?.name || 'playlist').toLowerCase().replace(/\s+/g, '_');

            if (exportFormat === 'csv') {
                content = exportToCsv(pSongs, playlist?.name);
                extension = 'csv';
                defaultFileName = `vibeon_${safePName}.csv`;
            } else if (exportFormat === 'txt') {
                content = exportToTxt(pSongs);
                extension = 'txt';
                defaultFileName = `vibeon_${safePName}.txt`;
            } else if (exportFormat === 'm3u8') {
                content = exportToM3u(pSongs, playlist?.name);
                extension = 'm3u8';
                defaultFileName = `vibeon_${safePName}.m3u8`;
            } else {
                content = exportToJson([], playlist ? [playlist] : []);
                extension = 'json';
                defaultFileName = `vibeon_${safePName}.json`;
            }
        }

        downloadFile(content, defaultFileName, getMimeType(extension));
        dispatch(showToast({ message: `Exported ${defaultFileName} successfully!` }));
    };

    const downloadFile = (content: string, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getMimeType = (ext: string) => {
        switch (ext) {
            case 'json': return 'application/json';
            case 'csv': return 'text/csv';
            case 'm3u8': return 'application/x-mpegurl';
            case 'txt': return 'text/plain';
            default: return 'text/plain';
        }
    };

    // --- Import File Drop / Pick Handler ---
    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const processFile = (file: File) => {
        if (file.size > 20 * 1024 * 1024) {
            dispatch(showToast({ message: 'File size exceeds 20MB limit.', type: 'error' }));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            setImportFileContent(text);
            setImportFileName(file.name);

            const preview = generateImportPreview(text, file.name, favorites, playlists);
            setPreviewResult(preview);
            setImportStep('preview');
        };
        reader.readAsText(file);
    };

    // --- Manual Resolution Handler ---
    const handleOpenResolutionModal = (index: number, track: PortableTrack) => {
        setResolvingTrackIndex(index);
        setSearchQuery(`${track.title} ${track.artist}`.trim());
        performSearch(`${track.title} ${track.artist}`.trim());
    };

    const performSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsSearching(true);
        const results = await jiosaavnAdapter.searchTracks(query, 8);
        setSearchResults(results);
        setIsSearching(false);
    };

    const handleSelectResolvedSong = (song: Song) => {
        if (resolvingTrackIndex !== null && previewResult) {
            setCustomMatches((prev) => ({
                ...prev,
                [resolvingTrackIndex]: song,
            }));
            dispatch(showToast({ message: `Matched to "${song.name}"` }));
        }
        setResolvingTrackIndex(null);
    };

    // --- Execute Import Handler ---
    const handleStartImport = async () => {
        if (!previewResult) return;

        if (importMode === 'replace' && !showReplaceConfirm) {
            setShowReplaceConfirm(true);
            return;
        }

        setShowReplaceConfirm(false);
        setImportStep('executing');
        setImportProgress(0);
        setIsCancelling(false);
        cancelRef.current = false;

        const summary = await executeImportJob(
            previewResult,
            { mode: importMode, customMatches },
            dispatch,
            () => (window as any).store?.getState?.() || ({} as any),
            (progress, currentSummary) => {
                setImportProgress(progress);
                setImportSummary(currentSummary);
            },
            () => cancelRef.current
        );

        setImportSummary(summary);
        setImportStep('summary');
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <IoOptionsOutline className="text-primary" /> Import & Export Library
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Backup your music, restore playlists, or convert CSV/M3U format files.
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors"
                        >
                            <IoClose size={24} />
                        </button>
                    </div>

                    {/* Mode Nav Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <button
                            onClick={() => setActiveTab('export')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                                activeTab === 'export'
                                    ? 'border-primary text-primary bg-white dark:bg-gray-800/80 shadow-sm'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <IoCloudDownloadOutline size={18} /> Export Library
                        </button>
                        <button
                            onClick={() => setActiveTab('import')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                                activeTab === 'import'
                                    ? 'border-primary text-primary bg-white dark:bg-gray-800/80 shadow-sm'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <IoCloudUploadOutline size={18} /> Import Library
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                        {activeTab === 'export' && (
                            <div className="space-y-6">
                                {/* Scope Picker */}
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">
                                        Select Export Content
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        <button
                                            onClick={() => setExportScope('full')}
                                            className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                                                exportScope === 'full'
                                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            <p className="font-bold text-xs sm:text-sm">Full Backup</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Favorites + All Playlists</p>
                                        </button>
                                        <button
                                            onClick={() => setExportScope('favorites')}
                                            className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                                                exportScope === 'favorites'
                                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            <p className="font-bold text-xs sm:text-sm">Favorites</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{favorites.length} song(s)</p>
                                        </button>
                                        <button
                                            onClick={() => setExportScope('playlist')}
                                            className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                                                exportScope === 'playlist'
                                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                            }`}
                                        >
                                            <p className="font-bold text-xs sm:text-sm">Playlist</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{playlists.length} available</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Playlist Selector if playlist scope */}
                                {exportScope === 'playlist' && (
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">
                                            Choose Playlist
                                        </label>
                                        <select
                                            value={selectedPlaylistId}
                                            onChange={(e) => setSelectedPlaylistId(e.target.value)}
                                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            {playlists.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.songs.length} tracks)
                                                </option>
                                            ))}
                                            {playlists.length === 0 && <option value="">No playlists created yet</option>}
                                        </select>
                                    </div>
                                )}

                                {/* Format Picker */}
                                <div>
                                    <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">
                                        Export Format
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {(['json', 'csv', 'm3u8', 'txt'] as const).map((fmt) => (
                                            <button
                                                key={fmt}
                                                disabled={exportScope === 'full' && fmt !== 'json'}
                                                onClick={() => setExportFormat(fmt)}
                                                className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase transition-all ${
                                                    exportFormat === fmt
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                .{fmt}
                                            </button>
                                        ))}
                                    </div>
                                    {exportScope === 'full' && (
                                        <p className="text-[10px] text-gray-500 mt-2">
                                            Full library backups use Vibe On JSON format to preserve full schema, playlists, and order metadata.
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleExport}
                                    className="w-full py-4 bg-primary hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                                >
                                    <IoCloudDownloadOutline size={20} /> Generate & Download Export File
                                </button>
                            </div>
                        )}

                        {activeTab === 'import' && (
                            <div className="space-y-6">
                                {importStep === 'select' && (
                                    <div className="space-y-6">
                                        {/* Dropzone */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary dark:hover:border-primary rounded-3xl p-8 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-800/30 group"
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".json,.csv,.txt,.m3u,.m3u8"
                                                onChange={handleFileSelected}
                                                className="hidden"
                                            />
                                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <IoCloudUploadOutline size={30} />
                                            </div>
                                            <p className="font-bold text-sm sm:text-base text-gray-800 dark:text-gray-200">
                                                Click or drop an import file here
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Supports Vibe On JSON, CSV, TXT song lists, or M3U/M3U8 playlists.
                                            </p>
                                        </div>

                                        {/* Mode Option */}
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">
                                                Import Strategy
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setImportMode('merge')}
                                                    className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                                                        importMode === 'merge'
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-gray-200 dark:border-gray-800'
                                                    }`}
                                                >
                                                    <p className="font-bold text-xs sm:text-sm">Merge (Non-Destructive)</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Appends missing items; safely ignores existing duplicates.</p>
                                                </button>
                                                <button
                                                    onClick={() => setImportMode('replace')}
                                                    className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                                                        importMode === 'replace'
                                                            ? 'border-red-500 bg-red-500/5 text-red-500 shadow-sm'
                                                            : 'border-gray-200 dark:border-gray-800'
                                                    }`}
                                                >
                                                    <p className="font-bold text-xs sm:text-sm">Replace / Overwrite</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Clears existing user library before importing.</p>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {importStep === 'preview' && previewResult && (
                                    <div className="space-y-6">
                                        {/* Preview Banner */}
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <IoDocumentTextOutline className="text-primary text-2xl shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm truncate">{importFileName}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase">
                                                        Format: {previewResult.suggestedFormat} | Found {previewResult.totalEntries} entries
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={resetImportState}
                                                className="text-xs text-gray-400 hover:text-red-500 font-bold shrink-0"
                                            >
                                                Change File
                                            </button>
                                        </div>

                                        {/* Matches summary stats */}
                                        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                                            <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                                                <p className="text-lg font-extrabold text-green-500">{previewResult.matchedCount}</p>
                                                <p className="text-[10px] font-bold text-green-600 uppercase">Matched</p>
                                            </div>
                                            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                                <p className="text-lg font-extrabold text-amber-500">{previewResult.unmatchedCount}</p>
                                                <p className="text-[10px] font-bold text-amber-600 uppercase">Unresolved</p>
                                            </div>
                                            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                                <p className="text-lg font-extrabold text-primary">{Object.keys(customMatches).length}</p>
                                                <p className="text-[10px] font-bold text-primary uppercase">Manually Matched</p>
                                            </div>
                                        </div>

                                        {/* Track List Preview */}
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">
                                                Parsed Tracks Preview
                                            </label>
                                            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                                {previewResult.parsedTracks.map((track, idx) => {
                                                    const customMatch = customMatches[idx];
                                                    const isMatched = !!track.matchedSong || !!customMatch;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 text-xs"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold truncate">
                                                                    {customMatch ? customMatch.name : track.title}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 truncate">
                                                                    {customMatch ? customMatch.primaryArtists : track.artist}
                                                                </p>
                                                            </div>
                                                            {isMatched ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 flex items-center gap-1 shrink-0">
                                                                    <IoCheckmarkCircle /> Matched
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenResolutionModal(idx, track)}
                                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors flex items-center gap-1 shrink-0"
                                                                >
                                                                    <IoSearchOutline /> Resolve Match
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={resetImportState}
                                                className="flex-1 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleStartImport}
                                                className="flex-2 py-3.5 bg-primary hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                                            >
                                                <IoCloudUploadOutline size={18} /> Confirm & Import {previewResult.totalEntries} Track(s)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {importStep === 'executing' && (
                                    <div className="py-12 text-center space-y-6">
                                        <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                        <div>
                                            <p className="text-lg font-bold">Importing Library Data...</p>
                                            <p className="text-xs text-gray-500 mt-1">{importProgress}% completed</p>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full bg-gray-200 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                                            <div
                                                className="bg-primary h-full transition-all duration-300"
                                                style={{ width: `${importProgress}%` }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => {
                                                cancelRef.current = true;
                                                setIsCancelling(true);
                                            }}
                                            disabled={isCancelling}
                                            className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-500/10 text-gray-700 dark:text-gray-300 hover:text-red-500 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                        >
                                            {isCancelling ? 'Cancelling...' : 'Cancel Import'}
                                        </button>
                                    </div>
                                )}

                                {importStep === 'summary' && importSummary && (
                                    <div className="space-y-6 text-center py-4">
                                        <div className="w-16 h-16 mx-auto bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                                            <IoCheckmarkCircle size={36} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Import Complete!</h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Library update process finished successfully.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                                <p className="font-extrabold text-base text-gray-800 dark:text-gray-200">
                                                    {importSummary.totalFound}
                                                </p>
                                                <p className="text-[10px] text-gray-400">Total Found</p>
                                            </div>
                                            <div className="p-3 bg-green-500/10 rounded-2xl">
                                                <p className="font-extrabold text-base text-green-500">
                                                    {importSummary.newlyImported}
                                                </p>
                                                <p className="text-[10px] text-green-600">Newly Imported</p>
                                            </div>
                                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                                <p className="font-extrabold text-base text-blue-500">
                                                    {importSummary.alreadyPresent}
                                                </p>
                                                <p className="text-[10px] text-blue-600">Already Existed</p>
                                            </div>
                                            <div className="p-3 bg-amber-500/10 rounded-2xl">
                                                <p className="font-extrabold text-base text-amber-500">
                                                    {importSummary.unmatched}
                                                </p>
                                                <p className="text-[10px] text-amber-600">Unresolved</p>
                                            </div>
                                        </div>

                                        {importSummary.errors.length > 0 && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-left text-xs text-red-500 max-h-24 overflow-y-auto">
                                                <p className="font-bold mb-1">Warnings / Errors:</p>
                                                {importSummary.errors.map((e, idx) => (
                                                    <p key={idx}>• {e}</p>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleClose}
                                            className="w-full py-3.5 bg-primary hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Overwrite Confirmation Dialog */}
                {showReplaceConfirm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-900 border border-red-500/30 p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-4">
                            <div className="w-12 h-12 mx-auto bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                                <IoAlertCircle size={28} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                Confirm Replace / Overwrite?
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Warning: Replacing your library will clear your current favorites and playlists before importing this file. This action cannot be undone.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowReplaceConfirm(false)}
                                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartImport}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all"
                                >
                                    Overwrite Library
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Track Resolution Modal */}
                {resolvingTrackIndex !== null && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">Match Song manually</h3>
                                <button
                                    onClick={() => setResolvingTrackIndex(null)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                    <IoClose size={20} />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && performSearch(searchQuery)}
                                    placeholder="Search song title or artist..."
                                    className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    onClick={() => performSearch(searchQuery)}
                                    className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-red-600 transition-colors"
                                >
                                    Search
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {isSearching ? (
                                    <p className="text-center py-8 text-xs text-gray-500">Searching catalog...</p>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((song) => (
                                        <div
                                            key={song.id}
                                            onClick={() => handleSelectResolvedSong(song)}
                                            className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors flex items-center gap-3 text-xs"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold truncate">{song.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{song.primaryArtists}</p>
                                            </div>
                                            <button className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors">
                                                Select
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-xs text-gray-500">No results found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AnimatePresence>
    );
};
