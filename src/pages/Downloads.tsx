import React from 'react';
import { PageTemplate } from '../components/PageTemplate';
import { DownloadsList } from '../components/downloads/DownloadsList';
import { StorageUsageInfo } from '../components/downloads/StorageUsageInfo';

const DownloadsPage: React.FC = () => {
    return (
        <PageTemplate title="Downloads">
            <div className="space-y-8">
                <StorageUsageInfo />
                <div>
                    <h3 className="text-xl font-bold mb-4">Your Downloads</h3>
                    <DownloadsList />
                </div>
            </div>
        </PageTemplate>
    );
};

export default DownloadsPage;
