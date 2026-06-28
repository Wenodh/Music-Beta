const decodeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
};

export const decodeHtmlEntities = (str: string): string => {
    if (!str || typeof str !== 'string') return str || '';

    // Fast path for strings without entities
    if (!str.includes('&')) return str;

    // First try a robust regex-based approach for common entities
    let decoded = str.replace(/&[a-z0-9#]+;/gi, (match) => {
        return decodeMap[match.toLowerCase()] || match;
    });

    // If it still contains entities, use the DOM as a fallback if available
    if (decoded.includes('&') && typeof document !== 'undefined') {
        try {
            const txt = document.createElement('textarea');
            txt.innerHTML = decoded;
            return txt.value;
        } catch (e) {
            return decoded;
        }
    }

    return decoded;
};
