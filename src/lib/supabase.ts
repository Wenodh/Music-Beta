import { logger } from "./logger";
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client initialization.
 * Variables must be prefixed with VITE_ and added to Vercel/Local environment.
 */
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Normalize URL: Ensure it starts with https:// and handle potential typos.
 */
const normalizeUrl = (url: string | undefined): string => {
    if (!url || url.includes('placeholder.supabase.co')) {
        return 'https://placeholder.supabase.co';
    }

    let normalized = url.trim();
    if (!normalized.startsWith('http')) {
        normalized = `https://${normalized}`;
    }

    // Remove trailing slash if present
    return normalized.replace(/\/$/, '');
};

export const supabaseUrl = normalizeUrl(rawSupabaseUrl);
export const isSupabaseConfigured =
    !!rawSupabaseUrl &&
    !rawSupabaseUrl.includes('placeholder.supabase.co') &&
    !!supabaseAnonKey &&
    supabaseAnonKey !== 'placeholder';

if (!isSupabaseConfigured) {
    logger.warn(
        'Supabase',
        'Supabase environment variables are missing or invalid. ' +
        'Authentication and cloud sync features will be disabled.'
    );
}

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
