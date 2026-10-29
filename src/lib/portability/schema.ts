import { VibeOnBackupEnvelope } from './types';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    version?: number;
}

/**
 * Validates whether an unparsed or parsed object conforms to the Vibe On Backup format (v1).
 */
export function validateVibeOnBackupSchema(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid JSON object: payload is empty or not an object.'] };
    }

    if (data.format !== 'vibeon-library') {
        errors.push(`Invalid backup format identifier: expected "vibeon-library", got "${data.format}".`);
    }

    if (typeof data.formatVersion !== 'number') {
        errors.push('Missing or invalid "formatVersion": expected a numeric schema version.');
    } else if (data.formatVersion > 1) {
        errors.push(`Unsupported schema formatVersion (${data.formatVersion}). This app supports formatVersion <= 1.`);
    }

    if (!data.exportedAt || typeof data.exportedAt !== 'string') {
        errors.push('Missing "exportedAt" ISO timestamp.');
    }

    if (!data.library || typeof data.library !== 'object') {
        errors.push('Missing "library" container object.');
    } else {
        const { favorites, playlists } = data.library;

        if (favorites !== undefined && !Array.isArray(favorites)) {
            errors.push('Field "library.favorites" must be an array.');
        }

        if (playlists !== undefined && !Array.isArray(playlists)) {
            errors.push('Field "library.playlists" must be an array.');
        }

        if (playlists && Array.isArray(playlists)) {
            playlists.forEach((p: any, idx: number) => {
                if (!p || typeof p !== 'object') {
                    errors.push(`Playlist at index ${idx} is invalid.`);
                } else {
                    if (typeof p.name !== 'string' || !p.name.trim()) {
                        errors.push(`Playlist at index ${idx} is missing a valid "name".`);
                    }
                    if (p.songs !== undefined && !Array.isArray(p.songs)) {
                        errors.push(`Playlist "${p.name || idx}" "songs" field must be an array.`);
                    }
                }
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        version: data?.formatVersion,
    };
}
