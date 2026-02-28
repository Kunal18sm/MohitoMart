import { memo } from 'react';
import { Link } from 'react-router-dom';

const ShopCard = ({ shop }) => {
    const imageUrl = shop.images?.[0] || 'https://via.placeholder.com/500x300?text=Shop+Image';

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover-elevate">
            <img
                src={imageUrl}
                alt={shop.name}
                loading="lazy"
                decoding="async"
                className="h-44 w-full object-cover"
            />
            <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-lg font-bold text-dark">{shop.name}</h3>
                    <span className="rounded-full bg-light px-3 py-1 text-xs font-semibold text-gray-600">
                        {shop.category}
                    </span>
                </div>

                <p className="line-clamp-1 text-sm text-gray-500">
                    {shop.location?.area}, {shop.location?.city}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
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
                    className="inline-flex rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary"
                >
                    Open Shop Profile
                </Link>
            </div>
        </div>
    );
};

export default memo(ShopCard);
