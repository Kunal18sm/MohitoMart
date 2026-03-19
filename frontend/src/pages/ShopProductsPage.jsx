import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { truncateMetaDescription } from '../utils/seo';

const PAGE_SIZE = 20;

const mergeUniqueEntries = (existingEntries = [], incomingEntries = []) => {
    const mergedEntries = [...existingEntries];
    const seenIds = new Set(
        existingEntries.map((entry) => String(entry?._id || '')).filter(Boolean)
    );

    incomingEntries.forEach((entry) => {
        const entryId = String(entry?._id || '');
        if (!entryId || seenIds.has(entryId)) {
            return;
        }

        seenIds.add(entryId);
        mergedEntries.push(entry);
    });

    return mergedEntries;
};

const ShopProductsPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [shopName, setShopName] = useState(() => location.state?.shopName || '');
    const requestIdRef = useRef(0);

    const fetchProducts = useCallback(
        async (targetPage = 1, { reset = false } = {}) => {
            const requestId = requestIdRef.current + 1;
            requestIdRef.current = requestId;

            try {
                if (reset) {
                    setLoading(true);
                    setLoadingMore(false);
                } else {
                    setLoadingMore(true);
                }
                setError('');

                const { data } = await api.get('/products', {
                    params: {
                        shopId: id,
                        page: targetPage,
                        limit: PAGE_SIZE,
                        sort: 'latest',
                    },
                });

                if (requestId !== requestIdRef.current) {
                    return;
                }

                const nextProducts = Array.isArray(data.products) ? data.products : [];
                const totalPages = Number(data.pages || 1);

                setProducts((previous) =>
                    reset ? nextProducts : mergeUniqueEntries(previous, nextProducts)
                );
                setCurrentPage(targetPage);
                setHasMore(targetPage < totalPages);

                if (!shopName && nextProducts[0]?.shop?.name) {
                    setShopName(nextProducts[0].shop.name);
                }
            } catch (err) {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                if (reset) {
                    setProducts([]);
                }
                setError(err.response?.data?.message || 'Unable to load shop products');
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [id, shopName]
    );

    useEffect(() => {
        fetchProducts(1, { reset: true });
    }, [fetchProducts]);

    const loadMore = () => {
        if (!hasMore || loadingMore) {
            return;
        }

        fetchProducts(currentPage + 1);
    };

    const headerTitle = useMemo(() => {
        if (shopName) {
            return `${shopName} Products`;
        }
        return 'Shop Products';
    }, [shopName]);

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <Seo
                title={headerTitle}
                description={truncateMetaDescription(
                    shopName
                        ? `Browse all products listed by ${shopName} on Mohito Mart.`
                        : 'Browse all products listed by this shop on Mohito Mart.'
                )}
                path={`/shop/${id}/products`}
                type="website"
            />
            <div className="mb-4">
                <p className="mb-2 text-sm text-gray-500">
                    <Link to="/" className="hover:underline">
                        {t('home') || 'Home'}
                    </Link>{' '}
                    / <Link to={`/shop/${id}`} className="hover:underline">Shop</Link> / Products
                </p>
                <h1 className="text-3xl font-black text-dark sm:text-4xl">{headerTitle}</h1>
            </div>

            {error && (
                <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {[...Array(8)].map((_, index) => (
                        <Skeleton key={`shop-products-skeleton-${index}`} type="product" />
                    ))}
                </div>
            )}

            {!loading && products.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">
                    This shop has not added any products yet.
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
                                <Skeleton key={`shop-products-loading-${index}`} type="product" />
                            ))}
                        </div>
                    )}

                    {hasMore && (
                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                {loadingMore ? (t('loading') || 'Loading...') : (t('load_more') || 'Load more')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ShopProductsPage;
