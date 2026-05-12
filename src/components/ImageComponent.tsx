import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageComponentProps {
    src: string;
    alt: string;
}

const ImageComponent: React.FC<ImageComponentProps> = ({ src, alt }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
            <AnimatePresence>
                {!isLoaded && src && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
                    >
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {src ? (
                <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                    src={src}
                    alt={alt}
                    onLoad={() => setIsLoaded(true)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500?text=No+Image';
                        setIsLoaded(true);
                    }}
                />
            ) : (
                <div className="text-gray-400">No Image</div>
            )}
        </div>
    );
};

export default ImageComponent;
