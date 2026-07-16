import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../../hooks/redux';
import { motion } from 'framer-motion';
import { IoStatsChart, IoCloudUpload, IoDocumentText, IoPeople, IoSettings } from 'react-icons/io5';

const CreatorDashboard: React.FC = () => {
    const [activeSection, setActiveTab] = useState<'content' | 'analytics' | 'uploads' | 'team'>('content');
    const { user } = useAppSelector(state => state.auth);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Creator Dashboard</h1>
                <p className="text-gray-500">Manage your shows, books, and analytics.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-8">
                <nav className="w-full md:w-64 space-y-2">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSection === 'content' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                    >
                        <IoDocumentText size={20} /> My Content
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSection === 'analytics' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                    >
                        <IoStatsChart size={20} /> Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('uploads')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSection === 'uploads' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                    >
                        <IoCloudUpload size={20} /> Uploads
                    </button>
                    <button
                        onClick={() => setActiveTab('team')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSection === 'team' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
                    >
                        <IoPeople size={20} /> Team
                    </button>
                </nav>

                <main className="flex-1 min-h-[600px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-800/20 p-6 md:p-8 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold capitalize">{activeSection}</h2>
                        {activeSection === 'content' && (
                            <button className="bg-primary text-white px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                                + Create New
                            </button>
                        )}
                    </div>

                    <div className="text-center py-20">
                        <div className="mb-4 flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                <IoDocumentText size={32} />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2">No {activeSection} found</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">Get started by uploading your first episode or show.</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CreatorDashboard;
