import React from 'react';
import { isSupabaseConfigured, supabaseUrl } from '../lib/supabase';

const ConfigWarning: React.FC = () => {
    // Only show in development if misconfigured, or if it's explicitly a placeholder in production
    const isPlaceholder = supabaseUrl.includes('placeholder.supabase.co');
    const isProduction = import.meta.env.PROD;

    if (isSupabaseConfigured && !isPlaceholder) {
        return null;
    }

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>
                    {isPlaceholder
                        ? "Using placeholder Supabase configuration. Cloud features are disabled."
                        : "Supabase is not correctly configured. Check your environment variables."}
                </span>
            </div>
            {isProduction && (
                <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold border border-amber-500/30 px-1.5 rounded">
                    Production
                </span>
            )}
        </div>
    );
};

export default ConfigWarning;
