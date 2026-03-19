import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { formatServicePrice } from '../utils/servicePrice';
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

const ShopServicesPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const { t } = useTranslation();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [shopName, setShopName] = useState(() => location.state?.shopName || '');
    const requestIdRef = useRef(0);

    const fetchServices = useCallback(
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

                const { data } = await api.get('/services', {
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

                const nextServices = Array.isArray(data.services) ? data.services : [];
                const totalPages = Number(data.pages || 1);

                setServices((previous) =>
                    reset ? nextServices : mergeUniqueEntries(previous, nextServices)
                );
                setCurrentPage(targetPage);
                setHasMore(targetPage < totalPages);

                if (!shopName && nextServices[0]?.shop?.name) {
                    setShopName(nextServices[0].shop.name);
                }
            } catch (err) {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                if (reset) {
                    setServices([]);
                }
                setError(err.response?.data?.message || 'Unable to load shop services');
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
        fetchServices(1, { reset: true });
    }, [fetchServices]);

    const loadMore = () => {
        if (!hasMore || loadingMore) {
            return;
        }

        fetchServices(currentPage + 1);
    };

    const headerTitle = useMemo(() => {
        if (shopName) {
            return `${shopName} Services`;
        }
        return 'Shop Services';
    }, [shopName]);

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <Seo
                title={headerTitle}
                description={truncateMetaDescription(
                    shopName
                        ? `Browse all services listed by ${shopName} on Mohito Mart.`
                        : 'Browse all services listed by this shop on Mohito Mart.'
                )}
                path={`/shop/${id}/services`}
                type="website"
            />
            <div className="mb-4">
                <p className="mb-2 text-sm text-gray-500">
                    <Link to="/" className="hover:underline">
                        {t('home') || 'Home'}
                    </Link>{' '}
                    / <Link to={`/shop/${id}`} className="hover:underline">Shop</Link> / Services
                </p>
                <h1 className="text-3xl font-black text-dark sm:text-4xl">{headerTitle}</h1>
            </div>

            {error && (
                <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
            )}

            {loading && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[...Array(6)].map((_, index) => (
                        <div
                            key={`shop-services-skeleton-${index}`}
                            className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                        />
                    ))}
                </div>
            )}

            {!loading && services.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">
                    This shop has not added any services yet.
                </p>
            )}

            {!loading && services.length > 0 && (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {services.map((service) => (
                            <Link
                                key={service._id}
                                to={`/service/${service._id}`}
                                className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <AdaptiveCardImage
                                    source={service.images?.[0]}
                                    alt={service.name}
                                    kind="service"
                                    responsiveOptions={{
                                        width: 640,
                                        widths: [240, 360, 480, 640],
                                        sizes:
                                            '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
                                    }}
                                    containerClassName="h-44 bg-white/40"
                                    fillContainer
                                    fitMode="cover"
                                    className="rounded-t-2xl"
                                />
                                <div className="flex flex-1 flex-col space-y-2.5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="line-clamp-1 text-lg font-black text-dark">{service.name}</h3>
                                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                            {service.category}
                                        </span>
                                    </div>

                                    <p className="text-base font-black text-primary">{formatServicePrice(service)}</p>

                                    <p className="line-clamp-2 text-sm text-gray-600">
                                        {service.description || 'Service details not added yet.'}
                                    </p>

                                    <div className="mt-auto rounded-xl bg-light p-3 text-sm text-gray-600">
                                        <p className="line-clamp-1 font-semibold text-dark">
                                            {service.shop?.name || 'Shop'}
                                        </p>
                                        <p className="line-clamp-1 text-xs">
                                            {service.shop?.location?.area && service.shop?.location?.city
                                                ? `${service.shop.location.area}, ${service.shop.location.city}`
                                                : 'Location not available'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {loadingMore && (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {[...Array(3)].map((_, index) => (
                                <div
                                    key={`shop-services-loading-${index}`}
                                    className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                                />
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
                                {loadingMore ? (t('loading') || 'Loading...') : (t('load_more_services') || 'Load more services')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ShopServicesPage;
