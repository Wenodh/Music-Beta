// @ts-ignore
import ColorThief from 'colorthief';

export const getDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const color = colorThief.getColor(img);
                // Convert RGB to Hex
                const hex = '#' + color.map((x: number) => {
                    const hexPart = x.toString(16);
                    return hexPart.length === 1 ? '0' + hexPart : hexPart;
                }).join('');
                resolve(hex);
            } catch (error) {
                console.error('Error extracting color:', error);
                resolve('#ef4444'); // Fallback
            }
        };

        img.onerror = () => {
            resolve('#ef4444'); // Fallback
        };
    });
};
