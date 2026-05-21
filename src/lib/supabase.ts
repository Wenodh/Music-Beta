import { createClient } from '@supabase/supabase-js';

// Using direct access to ensure Vite's static replacement works correctly during build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (supabaseUrl.includes('placeholder')) {
    console.warn('VibeOn: Supabase URL is using placeholder. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
