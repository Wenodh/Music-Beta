export const decodeHtmlEntities = (str: string): string => {
    if (!str || typeof str !== 'string') return str || '';

    if (typeof document !== 'undefined' && document.createElement) {
        const txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    }

    return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};
