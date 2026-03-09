import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { formatServicePrice } from '../utils/servicePrice';
import {
    buildAreaQueryParam,
    formatAreaSummary,
    getAreaFilterState,
} from '../utils/areaFilters';

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

const resolveServiceSort = (sortValue) => {
    const normalized = String(sortValue || 'latest').trim().toLowerCase();
    if (['latest', 'oldest', 'price_asc', 'price_desc'].includes(normalized)) {
        return normalized;
    }
    return 'latest';
};

const CategoryPage = () => {
    const { id } = useParams();
    const { t } = useTranslation();

    const savedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );
    const areaFilterState = useMemo(
        () => getAreaFilterState(savedLocation),
        [savedLocation]
    );
    const areaSummary = useMemo(
        () => formatAreaSummary(areaFilterState.areas),
        [areaFilterState.areas]
    );

    const [keywordInput, setKeywordInput] = useState('');
    const [sortByInput, setSortByInput] = useState('latest');
    const [appliedKeyword, setAppliedKeyword] = useState('');
    const [appliedSortBy, setAppliedSortBy] = useState('latest');
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingServices, setLoadingServices] = useState(true);
    const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
    const [loadingMoreServices, setLoadingMoreServices] = useState(false);
    const [productError, setProductError] = useState('');
    const [serviceError, setServiceError] = useState('');
    const [productCurrentPage, setProductCurrentPage] = useState(1);
    const [serviceCurrentPage, setServiceCurrentPage] = useState(1);
    const [hasMoreProducts, setHasMoreProducts] = useState(false);
    const [hasMoreServices, setHasMoreServices] = useState(false);
    const productRequestIdRef = useRef(0);
    const serviceRequestIdRef = useRef(0);

    const categoryName = decodeURIComponent(id || '');
    const areasQuery = useMemo(
        () => buildAreaQueryParam(areaFilterState.areas),
        [areaFilterState.areas]
    );

    const fetchCategoryProducts = useCallback(
        async (targetPage = 1, { reset = false } = {}) => {
            const requestId = productRequestIdRef.current + 1;
            productRequestIdRef.current = requestId;

            try {
                if (reset) {
                    setLoadingProducts(true);
                    setLoadingMoreProducts(false);
                } else {
                    setLoadingMoreProducts(true);
                }
                setProductError('');
                const { data } = await api.get('/products', {
                    params: {
                        category: categoryName,
                        keyword: appliedKeyword || undefined,
                        sort: appliedSortBy,
                        city: areaFilterState.city || undefined,
                        areas: areasQuery,
                        page: targetPage,
                        limit: PAGE_SIZE,
                    },
                });

                if (requestId !== productRequestIdRef.current) {
                    return;
                }

                const nextProducts = Array.isArray(data.products) ? data.products : [];
                const totalPages = Number(data.pages || 1);

                setProducts((previous) =>
                    reset ? nextProducts : mergeUniqueEntries(previous, nextProducts)
                );
                setProductCurrentPage(targetPage);
                setHasMoreProducts(targetPage < totalPages);
            } catch (error) {
                if (requestId !== productRequestIdRef.current) {
                    return;
                }

                if (reset) {
                    setProducts([]);
                }
                setProductError(
                    error.response?.data?.message ||
                        t('unable_fetch_category_products') ||
                        'Unable to fetch category products'
                );
            } finally {
                if (requestId === productRequestIdRef.current) {
                    if (reset) {
                        setLoadingProducts(false);
                    } else {
                        setLoadingMoreProducts(false);
                    }
                }
            }
        },
        [appliedKeyword, appliedSortBy, areaFilterState.city, areasQuery, categoryName, t]
    );

    const fetchCategoryServices = useCallback(
        async (targetPage = 1, { reset = false } = {}) => {
            const requestId = serviceRequestIdRef.current + 1;
            serviceRequestIdRef.current = requestId;

            try {
                if (reset) {
                    setLoadingServices(true);
                    setLoadingMoreServices(false);
                } else {
                    setLoadingMoreServices(true);
                }

                setServiceError('');
                const { data } = await api.get('/services', {
                    params: {
                        category: categoryName,
                        keyword: appliedKeyword || undefined,
                        sort: resolveServiceSort(appliedSortBy),
                        city: areaFilterState.city || undefined,
                        areas: areasQuery,
                        page: targetPage,
                        limit: PAGE_SIZE,
                    },
                });

                if (requestId !== serviceRequestIdRef.current) {
                    return;
                }

                const nextServices = Array.isArray(data.services) ? data.services : [];
                const totalPages = Number(data.pages || 1);

                setServices((previous) =>
                    reset ? nextServices : mergeUniqueEntries(previous, nextServices)
                );
                setServiceCurrentPage(targetPage);
                setHasMoreServices(targetPage < totalPages);
            } catch (error) {
                if (requestId !== serviceRequestIdRef.current) {
                    return;
                }

                if (reset) {
                    setServices([]);
                }

                setServiceError(
                    error.response?.data?.message ||
                        t('unable_load_services') ||
                        'Unable to load services'
                );
            } finally {
                if (requestId === serviceRequestIdRef.current) {
                    if (reset) {
                        setLoadingServices(false);
                    } else {
                        setLoadingMoreServices(false);
                    }
                }
            }
        },
        [appliedKeyword, appliedSortBy, areaFilterState.city, areasQuery, categoryName, t]
    );

    useEffect(() => {
        fetchCategoryProducts(1, { reset: true });
        fetchCategoryServices(1, { reset: true });
    }, [categoryName, areaFilterState.city, areasQuery, appliedKeyword, appliedSortBy]);

    const applyFilters = (event) => {
        event.preventDefault();
        setAppliedKeyword(keywordInput.trim());
        setAppliedSortBy(sortByInput);
    };

    const loadMoreProducts = () => {
        if (!hasMoreProducts || loadingMoreProducts) {
            return;
        }

        fetchCategoryProducts(productCurrentPage + 1);
    };

    const loadMoreServices = () => {
        if (!hasMoreServices || loadingMoreServices) {
            return;
        }

        fetchCategoryServices(serviceCurrentPage + 1);
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-4">
                <p className="mb-2 text-sm text-gray-500">
                    <Link to="/" className="hover:underline">
                        {t('home') || 'Home'}
                    </Link>{' '}
                    / {t('category') || 'Category'}
                </p>
                <h1 className="text-3xl font-black text-dark sm:text-4xl">
                    {categoryName.replace(/\b\w/g, (char) => char.toUpperCase())}
                </h1>
                <p className="text-gray-500">
                    {areaFilterState.city && areaFilterState.areas.length
                        ? `${areaSummary}, ${areaFilterState.city}`
                        : t('all_locations') || 'All locations'}
                </p>
            </div>

            <div className="sticky top-[76px] z-30 -mx-4 px-4 py-3 bg-app-bg/80 backdrop-blur-md mb-8">
                <form
                    onSubmit={applyFilters}
                    className="grid w-full gap-2 rounded-xl border border-glass-border glass-panel p-3 shadow-sm sm:max-w-3xl md:grid-cols-3"
                >
                    <input
                        value={keywordInput}
                        onChange={(event) => setKeywordInput(event.target.value)}
                        aria-label={t('search_product') || 'Search product'}
                        placeholder={t('search_product') || 'Search product'}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <select
                        value={sortByInput}
                        onChange={(event) => setSortByInput(event.target.value)}
                        aria-label={t('product_sort_order') || 'Sort products'}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                        <option value="latest">{t('latest') || 'Latest'}</option>
                        <option value="oldest">{t('oldest') || 'Oldest'}</option>
                        <option value="price_asc">{t('price_low_to_high') || 'Price low to high'}</option>
                        <option value="price_desc">{t('price_high_to_low') || 'Price high to low'}</option>
                        <option value="views_desc">{t('most_viewed') || 'Most viewed'}</option>
                    </select>
                    <button
                        type="submit"
                        className="rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary"
                    >
                        {t('apply_filters') || 'Apply Filters'}
                    </button>
                </form>
                <p className="mt-3 text-[11px] text-gray-500">
                    {areaFilterState.city && areaFilterState.areas.length
                        ? `${t('area_filter_sync_with_values_prefix') || 'Area filter is synced from the Home page:'} ${areaSummary}, ${areaFilterState.city}.`
                        : t('area_filter_sync_home') || 'Area filter is synced with the Home page area feed selection.'}
                </p>
            </div>

            <section className="mb-10">
                <div className="mb-4">
                    <h2 className="text-2xl font-black text-dark">Products</h2>
                    <p className="text-sm text-gray-500">Products from shops in this category.</p>
                </div>

                {productError && (
                    <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">{productError}</p>
                )}

                {loadingProducts && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {[...Array(8)].map((_, index) => (
                            <Skeleton key={`product-skeleton-${index}`} type="product" />
                        ))}
                    </div>
                )}

                {!loadingProducts && products.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">
                        {t('no_products_for_category_location') || 'No product is available for this category in the selected location.'}
                    </p>
                )}

                {!loadingProducts && products.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {products.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    desktopTall
                                    homeSized
                                />
                            ))}
                        </div>

                        {loadingMoreProducts && (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {[...Array(5)].map((_, index) => (
                                    <Skeleton key={`category-product-loading-${index}`} type="product" />
                                ))}
                            </div>
                        )}

                        {hasMoreProducts && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={loadMoreProducts}
                                    disabled={loadingMoreProducts}
                                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                >
                                    {loadingMoreProducts ? (t('loading') || 'Loading...') : (t('load_more') || 'Load more')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section>
                <div className="mb-4">
                    <h2 className="text-2xl font-black text-dark">Services</h2>
                    <p className="text-sm text-gray-500">Services from shops in this category.</p>
                </div>

                {serviceError && (
                    <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serviceError}</p>
                )}

                {loadingServices && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {[...Array(6)].map((_, index) => (
                            <div
                                key={`service-skeleton-${index}`}
                                className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                            />
                        ))}
                    </div>
                )}

                {!loadingServices && services.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">
                        {t('no_services_for_filter') || 'No service is available for this filter.'}
                    </p>
                )}

                {!loadingServices && services.length > 0 && (
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
                                            {service.description || (t('service_details_not_added') || 'Service details not added yet.')}
                                        </p>

                                        <div className="mt-auto rounded-xl bg-light p-3 text-sm text-gray-600">
                                            <p className="line-clamp-1 font-semibold text-dark">
                                                {service.shop?.name || (t('shop') || 'Shop')}
                                            </p>
                                            <p className="line-clamp-1 text-xs">
                                                {service.shop?.location?.area && service.shop?.location?.city
                                                    ? `${service.shop.location.area}, ${service.shop.location.city}`
                                                    : t('location_not_available') || 'Location not available'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {loadingMoreServices && (
                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {[...Array(3)].map((_, index) => (
                                    <div
                                        key={`service-loading-${index}`}
                                        className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                                    />
                                ))}
                            </div>
                        )}

                        {hasMoreServices && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={loadMoreServices}
                                    disabled={loadingMoreServices}
                                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                >
                                    {loadingMoreServices ? (t('loading') || 'Loading...') : (t('load_more_services') || 'Load more services')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
};

export default CategoryPage;
