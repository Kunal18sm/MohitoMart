import { memo } from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ product, compact = false, desktopTall = false }) => {
    const imageUrl = product.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
    const compactImageClass = desktopTall ? 'h-28 sm:h-32 lg:h-36' : 'h-28 sm:h-32';
    const regularImageClass = desktopTall
        ? 'h-[120px] sm:h-36 md:h-40 lg:h-48'
        : 'h-[120px] sm:h-36 md:h-40';

    return (
        <Link
            to={`/product/${product._id}`}
            className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="relative overflow-hidden bg-gray-100">
                <img
                    src={imageUrl}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        compact ? compactImageClass : regularImageClass
                    }`}
                />
            </div>

            <div className={`${compact ? 'p-2.5' : 'p-3'}`}>
                {!compact && (
                    <h3 className="mb-1.5 line-clamp-1 hidden text-sm font-semibold text-dark sm:block">
                        {product.name}
                    </h3>
                )}

                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-dark sm:text-base">
                        Rs {Number(product.price).toFixed(0)}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 sm:text-xs">
                        {product.viewsCount || 0} views
                    </p>
                </div>
            </div>
        </Link>
    );
};

export default memo(ProductCard);
