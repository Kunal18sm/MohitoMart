import { memo } from 'react';
import { Link } from 'react-router-dom';
import { applyImageFallback, resolveImageSource } from '../utils/imageFallbacks';

const ShopCard = ({ shop }) => {
    const imageUrl = resolveImageSource(shop.images?.[0], 'shop');

    return (
        <div className="group overflow-hidden rounded-2xl glass-panel hover-elevate">
            <div className="relative overflow-hidden">
                <img
                    src={imageUrl}
                    alt={shop.name}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => applyImageFallback(event, 'shop')}
                    className="h-32 w-full object-cover sm:h-40 md:h-44"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {shop.isServiceAvailable && (
                        <span className="rounded-md bg-blue-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1 w-max">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Service
                        </span>
                    )}
                </div>
            </div>
            <div className="space-y-2 p-3.5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-base font-bold text-dark">{shop.name}</h3>
                    <span className="rounded-full bg-light px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                        {shop.category}
                    </span>
                </div>

                <p className="line-clamp-1 text-xs text-gray-500">
                    {shop.location?.area}, {shop.location?.city}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        {Number(shop.rating || 0).toFixed(1)} stars ({shop.numRatings || 0})
                    </span>
                    {shop.isFollowed && (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                            Following
                        </span>
                    )}
                </div>

                <Link
                    to={`/shop/${shop._id}`}
                    className="inline-flex rounded-lg bg-dark px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary"
                >
                    Open Shop Profile
                </Link>
            </div>
        </div>
    );
};

export default memo(ShopCard);
