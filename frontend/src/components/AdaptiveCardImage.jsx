import {
    applyImageFallback,
    getResponsiveImageProps,
    resolveImageSource,
} from '../utils/imageFallbacks';

const IMAGE_ALT_FALLBACKS = {
    product: 'Product image',
    shop: 'Shop image',
    service: 'Service image',
};

const AdaptiveCardImage = ({
    source,
    alt,
    kind = 'product',
    responsiveOptions = {},
    containerClassName = '',
    fillContainer = false,
    fitMode = 'contain',
    className = '',
}) => {
    const resolvedAlt = String(alt || IMAGE_ALT_FALLBACKS[kind] || 'Image').trim();
    const objectFitClass = fitMode === 'cover' ? 'object-cover' : 'object-contain';
    const imageProps = getResponsiveImageProps(resolveImageSource(source, kind), {
        kind,
        crop: 'limit',
        quality: 'auto:eco',
        ...responsiveOptions,
    });

    return (
        <div className={`overflow-hidden ${containerClassName}`.trim()}>
            <img
                src={imageProps.src}
                srcSet={imageProps.srcSet}
                sizes={imageProps.sizes}
                width={imageProps.width}
                height={imageProps.height}
                alt={resolvedAlt}
                loading="lazy"
                decoding="async"
                onError={(event) => applyImageFallback(event, kind)}
                className={`block w-full max-w-full ${objectFitClass} ${fillContainer ? 'h-full' : 'h-auto'} ${className}`.trim()}
            />
        </div>
    );
};

export default AdaptiveCardImage;
