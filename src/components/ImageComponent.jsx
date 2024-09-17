const ImageComponent = ({ src, alt, width = 250, height = 250 }) => (
    <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="mx-auto mb-4 rounded-lg"
        loading="lazy"
    />
);

export default ImageComponent;
