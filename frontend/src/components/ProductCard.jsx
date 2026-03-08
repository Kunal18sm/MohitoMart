import { memo } from 'react';
import { Link } from 'react-router-dom';
import AdaptiveCardImage from './AdaptiveCardImage';
import { formatProductPrice } from '../utils/productPrice';

const ProductCard = ({
    product,
    compact = false,
    desktopTall = false,
    homeSized = false,
    fixedFrame = true,
}) => {
    const imageSizes = compact
        ? '(max-width: 640px) 52vw, (max-width: 1024px) 35vw, 220px'
        : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw';
    const compactImageClass = desktopTall ? 'h-24 sm:h-28 lg:h-32' : 'h-24 sm:h-28';
    const regularImageClass = desktopTall
        ? 'h-[104px] sm:h-32 md:h-36 lg:h-40'
        : 'h-[104px] sm:h-32 md:h-36';
    const useFixedFrame = fixedFrame || homeSized;
    const imageFrameClass = useFixedFrame ? (compact ? compactImageClass : regularImageClass) : '';

    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;

    return (
        <Link
            to={`/product/${product._id}`}
            className="group block h-full overflow-hidden rounded-2xl glass-panel transition-all duration-300 hover-elevate"
        >
            <div className={`relative overflow-hidden ${compact ? 'bg-transparent' : 'bg-white/50'}`}>
                <AdaptiveCardImage
                    source={product.images?.[0]}
                    alt={product.name}
                    kind="product"
                    responsiveOptions={{
                        width: compact ? 320 : 400,
                        widths: compact ? [160, 220, 280, 320] : [180, 240, 320, 400],
                        sizes: imageSizes,
                    }}
                    containerClassName={`bg-white/40 ${imageFrameClass}`.trim()}
                    fillContainer={useFixedFrame}
                    className="rounded-t-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {hasDiscount && (
                    <div className="absolute top-2 right-2 rounded-full bg-secondary/90 px-2 py-0.5 text-[10px] sm:text-xs font-black text-white shadow-sm backdrop-blur-md">
                        {discountPercent}% OFF
                    </div>
                )}
            </div>

            <div className={`${compact ? 'p-2' : 'p-2.5'} flex flex-1 flex-col`}>
                {!compact && (
                    <h3 className="mb-1 line-clamp-1 hidden text-xs font-semibold text-dark sm:block">
                        {product.name}
                    </h3>
                )}

                <div className="mt-auto flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-dark sm:text-xs">
                        {formatProductPrice(product)}
                    </p>
                    <p className="text-[10px] font-medium text-gray-500 sm:text-[11px]">
                        {product.viewsCount || 0} views
                    </p>
                </div>
            </div>
        </Link>
    );
};

export default memo(ProductCard);
