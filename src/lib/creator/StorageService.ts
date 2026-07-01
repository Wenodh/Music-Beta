import { supabase } from '../supabase';

export interface StorageProvider {
    upload(path: string, file: File | Blob): Promise<string>;
    download(path: string): Promise<Blob>;
    delete(path: string): Promise<void>;
    getPublicUrl(path: string): string;
}

export class SupabaseStorageProvider implements StorageProvider {
    constructor(private bucket: string = 'creator-assets') {}

    async upload(path: string, file: File | Blob): Promise<string> {
        const { data, error } = await supabase.storage.from(this.bucket).upload(path, file, {
            upsert: true
        });
        if (error) throw error;
        return data.path;
    }

    async download(path: string): Promise<Blob> {
        const { data, error } = await supabase.storage.from(this.bucket).download(path);
        if (error) throw error;
        return data;
    }

    async delete(path: string): Promise<void> {
        const { error } = await supabase.storage.from(this.bucket).remove([path]);
        if (error) throw error;
    }

    getPublicUrl(path: string): string {
        const { data } = supabase.storage.from(this.bucket).getPublicUrl(path);
        return data.publicUrl;
    }
}

export class CreatorStorageService {
    private static instance: CreatorStorageService;
    private provider: StorageProvider;

    private constructor() {
        this.provider = new SupabaseStorageProvider();
    }

    public static getInstance(): CreatorStorageService {
        if (!CreatorStorageService.instance) {
            CreatorStorageService.instance = new CreatorStorageService();
        }
        return CreatorStorageService.instance;
    }

    public setProvider(provider: StorageProvider) {
        this.provider = provider;
    }

    async uploadAsset(organizationId: string, type: string, file: File | Blob): Promise<string> {
        const filename = `${crypto.randomUUID()}-${(file as File).name || 'asset'}`;
        const path = `${organizationId}/${type}/${filename}`;
        return this.provider.upload(path, file);
    }

    getAssetUrl(path: string): string {
        return this.provider.getPublicUrl(path);
    }
}

export const creatorStorage = CreatorStorageService.getInstance();
