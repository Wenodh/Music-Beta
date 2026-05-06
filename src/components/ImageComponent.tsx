import React from 'react';

interface ImageComponentProps {
    src: string;
    alt: string;
}

const ImageComponent: React.FC<ImageComponentProps> = ({ src, alt }) => {
    return (
        <img
            src={src}
            alt={alt}
            width={160}
            height={160}
            className="rounded-lg mb-2 shadow-2xl"
            loading="lazy"
        />
    );
};

export default ImageComponent;
