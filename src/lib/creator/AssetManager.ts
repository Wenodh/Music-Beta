import { MediaAsset } from '../audio-sdk/models';
import { creatorStorage } from './StorageService';
import { supabase } from '../supabase';

export class AssetManager {
    private static instance: AssetManager;

    private constructor() {}

    public static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    async createAsset(organizationId: string, type: MediaAsset['type'], file: File | Blob): Promise<MediaAsset> {
        const path = await creatorStorage.uploadAsset(organizationId, type, file);
        const url = creatorStorage.getAssetUrl(path);

        const asset: MediaAsset = {
            id: crypto.randomUUID(),
            type,
            url,
            size: file.size,
            status: 'pending',
            format: (file as File).type
        };

        // Save metadata to database
        const { error } = await supabase.from('media_assets').insert({
            ...asset,
            organization_id: organizationId,
            storage_path: path
        });

        if (error) throw error;
        return asset;
    }

    async getAssetsByMediaId(mediaId: string): Promise<MediaAsset[]> {
        const { data, error } = await supabase
            .from('media_assets')
            .select('*')
            .eq('media_id', mediaId);

        if (error) throw error;
        return data as MediaAsset[];
    }
}

export const assetManager = AssetManager.getInstance();
