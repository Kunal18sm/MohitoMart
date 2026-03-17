import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';

const FOLLOWED_FEED_PAGE_SIZE = 20;
const FOLLOWED_FEED_EXCLUDE_LIMIT = 200;

const toProductIdKey = (product = {}) => String(product?._id || '');

const mergeProductsById = (existingProducts = [], incomingProducts = []) => {
    const merged = [...existingProducts];
    const seenProductIds = new Set(existingProducts.map((entry) => toProductIdKey(entry)).filter(Boolean));

    incomingProducts.forEach((entry) => {
        const key = toProductIdKey(entry);
        if (!key || seenProductIds.has(key)) {
            return;
        }

        seenProductIds.add(key);
        merged.push(entry);
    });

    return merged;
};

const FollowedFeedPage = () => {
    const { t } = useTranslation();
    const { showError } = useFlash();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const requestIdRef = useRef(0);
    const loadedIdsRef = useRef([]);

    const fetchFollowedProducts = useCallback(
        async ({ reset = false } = {}) => {
            const requestId = requestIdRef.current + 1;
            requestIdRef.current = requestId;

            try {
                if (reset) {
                    setLoading(true);
                    setLoadingMore(false);
                } else {
                    setLoadingMore(true);
                }

                const excludeIds = reset
                    ? []
                    : loadedIdsRef.current.slice(-FOLLOWED_FEED_EXCLUDE_LIMIT);

                const { data } = await api.get('/users/feed/followed/random', {
                    params: {
                        limit: FOLLOWED_FEED_PAGE_SIZE,
                        excludeIds: excludeIds.length ? excludeIds.join(',') : undefined,
                    },
                    cache: false,
                });

                if (requestId !== requestIdRef.current) {
                    return;
                }

                const nextProducts = Array.isArray(data.products) ? data.products : [];
                setProducts((previous) =>
                    reset ? nextProducts : mergeProductsById(previous, nextProducts)
                );

                const nextLoadedIds = reset ? [] : [...loadedIdsRef.current];
                nextProducts.forEach((product) => {
                    const key = toProductIdKey(product);
                    if (key && !nextLoadedIds.includes(key)) {
                        nextLoadedIds.push(key);
                    }
                });
                loadedIdsRef.current = nextLoadedIds;

                setHasMore(nextProducts.length === FOLLOWED_FEED_PAGE_SIZE);
            } catch (error) {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                if (reset) {
                    setProducts([]);
                    loadedIdsRef.current = [];
                }

                setHasMore(false);
                showError(extractErrorMessage(error, t('unable_load_followed_feed') || 'Unable to load followed feed'));
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [showError, t]
    );

    useEffect(() => {
        fetchFollowedProducts({ reset: true });
    }, [fetchFollowedProducts]);

    const loadMoreProducts = () => {
        if (!hasMore || loading || loadingMore) {
            return;
        }

        fetchFollowedProducts();
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-4">
                <p className="mb-2 text-sm text-gray-500">
                    <Link to="/" className="hover:underline">
                        {t('home') || 'Home'}
                    </Link>{' '}
                    / {t('your_feed') || 'Your Feed'}
                </p>
                <h1 className="text-3xl font-black text-dark sm:text-4xl">
                    {t('followed_shops_updates') || 'Followed Shops Updates'}
                </h1>
                <p className="text-sm text-gray-500">
                    {t('followed_feed_subtitle') || 'Random picks from the shops you follow.'}
                </p>
            </div>

            {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {[...Array(8)].map((_, index) => (
                        <Skeleton key={`followed-feed-skeleton-${index}`} type="product" />
                    ))}
                </div>
            )}

            {!loading && products.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">
                    {t('no_followed_products') ||
                        'No products are available from followed shops yet. Follow shops to see their products here.'}
                </p>
            )}

            {!loading && products.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} desktopTall homeSized />
                        ))}
                    </div>

                    {loadingMore && (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {[...Array(5)].map((_, index) => (
                                <Skeleton key={`followed-feed-loading-${index}`} type="product" />
                            ))}
                        </div>
                    )}

                    {hasMore && !loadingMore && (
                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={loadMoreProducts}
                                className="rounded-xl border border-transparent bg-dark px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-primary hover:shadow-lg sm:px-8 sm:py-3 sm:text-base"
                            >
                                {t('load_more') || 'Load more'}
                            </button>
                        </div>
                    )}

                    {!hasMore && !loadingMore && (
                        <p className="mt-4 text-center text-xs font-medium text-gray-500">
                            {t('end_of_feed') || 'You have reached the end of this feed.'}
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default FollowedFeedPage;
