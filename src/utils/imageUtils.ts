export interface ImageQualityItem {
    quality?: string;
    url: string;
}

/**
 * Extracts the highest quality image URL from an API data payload containing image string or array of qualities.
 */
export const extractImageUrl = (
    data: { image?: string | ImageQualityItem[] } | null | undefined,
    targetQuality = '500x500'
): string => {
    if (!data || !data.image) return '';
    if (Array.isArray(data.image)) {
        if (data.image.length === 0) return '';
        const found = data.image.find((img) => img.quality === targetQuality);
        return found?.url || data.image[data.image.length - 1]?.url || '';
    }
    return typeof data.image === 'string' ? data.image : '';
};
