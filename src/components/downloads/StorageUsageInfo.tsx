import React, { useState, useEffect } from 'react';
import { StorageService } from '../../lib/storage/StorageService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export const StorageUsageInfo: React.FC = () => {
    const [usage, setUsage] = useState(0);
    const limit = useSelector((state: RootState) => state.musicPlayer.downloadSettings.storageLimit);

    useEffect(() => {
        const fetchUsage = async () => {
            const bytes = await StorageService.getStorageUsage();
            setUsage(bytes);
        };
        fetchUsage();
    }, []);

    const percentage = Math.min((usage / limit) * 100, 100);
    const formattedUsage = (usage / (1024 * 1024 * 1024)).toFixed(2);
    const formattedLimit = (limit / (1024 * 1024 * 1024)).toFixed(0);

    return (
        <div
            className="bg-secondary-bg p-6 rounded-2xl"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={usage}
            aria-valuetext={`${formattedUsage} gigabytes used of ${formattedLimit} gigabytes. ${percentage.toFixed(0)} percent used.`}
        >
            <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-secondary-text text-sm mb-1" id="storage-label">Storage Usage</p>
                    <h3 className="text-2xl font-bold" aria-labelledby="storage-label">
                        {formattedUsage} GB <span className="text-secondary-text text-lg font-normal">/ {formattedLimit} GB</span>
                    </h3>
                </div>
                {percentage > 80 && (
                    <span className="text-orange-400 text-sm font-medium px-3 py-1 bg-orange-400/10 rounded-full" role="alert">
                        Nearly Full
                    </span>
                )}
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${percentage > 80 ? 'bg-orange-400' : 'bg-accent'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
