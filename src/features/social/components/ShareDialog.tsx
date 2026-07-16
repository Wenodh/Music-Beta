import React, { useState } from 'react';

interface ShareDialogProps {
    title: string;
    url: string;
    onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ title, url, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
                <header className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Share {title}</h2>
                    <button onClick={onClose} className="p-2 bg-secondary/10 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-white rounded-2xl mb-4 shadow-inner">
                        <div className="w-40 h-40 bg-secondary/10 flex items-center justify-center text-center p-4 rounded-xl border-2 border-dashed border-secondary/20">
                            <span className="text-xs text-secondary italic">QR Code ready for Phase 8 scanning</span>
                        </div>
                    </div>
                    <p className="text-xs text-secondary text-center">Scan to open directly in Vibe On</p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-secondary/5 rounded-xl border border-secondary/10">
                        <input
                            readOnly
                            value={url}
                            className="bg-transparent flex-1 text-sm outline-none overflow-hidden text-ellipsis"
                        />
                        <button
                            onClick={handleCopy}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {['WhatsApp', 'Twitter', 'Facebook', 'Email'].map(platform => (
                            <button key={platform} className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                                    <div className="w-6 h-6 bg-secondary/20 rounded-lg" />
                                </div>
                                <span className="text-[10px] text-secondary">{platform}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareDialog;
