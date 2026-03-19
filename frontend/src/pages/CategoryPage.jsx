import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Seo from '../components/Seo';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { formatServicePrice } from '../utils/servicePrice';
import { truncateMetaDescription } from '../utils/seo';
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
    const [sortByInput, setSortByInput] = useState('random');
    const [appliedKeyword, setAppliedKeyword] = useState('');
    const [appliedSortBy, setAppliedSortBy] = useState('random');
    const [products, setProducts] = useState([]);
    const [randomServices, setRandomServices] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingRandomServices, setLoadingRandomServices] = useState(false);
    const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
    const [productError, setProductError] = useState('');
    const [productCurrentPage, setProductCurrentPage] = useState(1);
    const [hasMoreProducts, setHasMoreProducts] = useState(false);
    const productRequestIdRef = useRef(0);
    const productExcludeIdsRef = useRef([]);

    const categoryName = decodeURIComponent(id || '');
    const categoryLabel = useMemo(
        () => categoryName.replace(/\b\w/g, (char) => char.toUpperCase()),
        [categoryName]
    );
    const areasQuery = useMemo(
        () => buildAreaQueryParam(areaFilterState.areas),
        [areaFilterState.areas]
    );

    const fetchCategoryProducts = useCallback(
        async (targetPage = 1, { reset = false } = {}) => {
            const requestId = productRequestIdRef.current + 1;
            productRequestIdRef.current = requestId;
            const isRandomSort = appliedSortBy === 'random';

            try {
                if (reset) {
                    setLoadingProducts(true);
                    setLoadingMoreProducts(false);
                } else {
                    setLoadingMoreProducts(true);
                }
                setProductError('');

                const productParams = {
                    category: categoryName,
                    keyword: appliedKeyword || undefined,
                    city: areaFilterState.city || undefined,
                    areas: areasQuery,
                    limit: PAGE_SIZE,
                };

                let data = null;

                if (isRandomSort) {
                    const excludeIds = reset
                        ? []
                        : productExcludeIdsRef.current.slice(-200);

                    const response = await api.get('/products/random', {
                        params: {
                            ...productParams,
                            excludeIds: excludeIds.length ? excludeIds.join(',') : undefined,
                        },
                        cache: false,
                    });
                    data = response.data;
                } else {
                    const response = await api.get('/products', {
                        params: {
                            ...productParams,
                            sort: appliedSortBy,
                            page: targetPage,
                        },
                    });
                    data = response.data;
                }

                if (requestId !== productRequestIdRef.current) {
                    return;
                }

                const nextProducts = Array.isArray(data.products) ? data.products : [];

                setProducts((previous) =>
                    reset ? nextProducts : mergeUniqueEntries(previous, nextProducts)
                );
                setProductCurrentPage(targetPage);

                if (isRandomSort) {
                    const nextExcludeIds = reset ? [] : [...productExcludeIdsRef.current];
                    nextProducts.forEach((product) => {
                        const productId = String(product?._id || '');
                        if (productId && !nextExcludeIds.includes(productId)) {
                            nextExcludeIds.push(productId);
                        }
                    });
                    productExcludeIdsRef.current = nextExcludeIds;
                    setHasMoreProducts(nextProducts.length === PAGE_SIZE);
                } else {
                    const totalPages = Number(data.pages || 1);
                    setHasMoreProducts(targetPage < totalPages);
                }
            } catch (error) {
                if (requestId !== productRequestIdRef.current) {
                    return;
                }

                if (reset) {
                    setProducts([]);
                    productExcludeIdsRef.current = [];
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

    const fetchCategoryServices = useCallback(async () => {
        try {
            setLoadingRandomServices(true);
            const { data } = await api.get('/services/random', {
                params: {
                    category: categoryName,
                    city: areaFilterState.city || undefined,
                    areas: areasQuery,
                    limit: 20,
                },
            });
            setRandomServices(Array.isArray(data.services) ? data.services : []);
        } catch (error) {
            setRandomServices([]);
        } finally {
            setLoadingRandomServices(false);
        }
    }, [areaFilterState.city, areasQuery, categoryName]);

    useEffect(() => {
        fetchCategoryProducts(1, { reset: true });
        fetchCategoryServices();
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

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <Seo
                title={`${categoryLabel} Near You`}
                description={truncateMetaDescription(
                    `Browse ${categoryLabel} products and services from local shops on Mohito Mart.`
                )}
                path={`/category/${encodeURIComponent(id || '')}`}
                type="website"
            />
            <div className="mb-4">
                <p className="mb-2 text-sm text-gray-500">
                    <Link to="/" className="hover:underline">
                        {t('home') || 'Home'}
                    </Link>{' '}
                    / {t('category') || 'Category'}
                </p>
                <h1 className="text-3xl font-black text-dark sm:text-4xl">
                    {categoryLabel}
                </h1>
                <p className="text-gray-500">
                    {areaFilterState.city && areaFilterState.areas.length
                        ? `${areaSummary}, ${areaFilterState.city}`
                        : t('all_locations') || 'All locations'}
                </p>
            </div>

            <div className="-mx-4 mb-8 px-4 py-3">
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
                        <option value="random">{t('random') || 'Random'}</option>
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

            {!loadingRandomServices && randomServices.length > 0 && (
                <section className="mb-10">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black text-dark">Services in this category</h2>
                            <p className="text-sm text-gray-500">
                                Random picks from shops offering services.
                            </p>
                        </div>
                    </div>

                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                        {randomServices.map((service) => (
                            <Link
                                key={service._id}
                                to={`/service/${service._id}`}
                                className="group min-w-[65%] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:min-w-[40%] md:min-w-[240px] lg:min-w-[220px]"
                            >
                                <AdaptiveCardImage
                                    source={service.images?.[0]}
                                    alt={service.name}
                                    kind="service"
                                    responsiveOptions={{
                                        width: 360,
                                        widths: [180, 240, 300, 360],
                                        sizes: '(max-width: 640px) 70vw, 240px',
                                    }}
                                    containerClassName="h-24 bg-white/40 sm:h-28"
                                    fillContainer
                                    fitMode="cover"
                                    className="rounded-t-2xl"
                                />
                                <div className="p-3">
                                    <h3 className="line-clamp-1 text-sm font-black text-dark">
                                        {service.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {service.shop?.name || (t('shop') || 'Shop')}
                                    </p>
                                    <p className="mt-1 text-sm font-black text-primary">
                                        {formatServicePrice(service)}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {loadingRandomServices && (
                <section className="mb-10">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black text-dark">Services in this category</h2>
                            <p className="text-sm text-gray-500">
                                Random picks from shops offering services.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[...Array(4)].map((_, index) => (
                            <div
                                key={`category-service-skeleton-${index}`}
                                className="min-w-[65%] shrink-0 rounded-2xl border border-gray-200 bg-white/80 sm:min-w-[40%] md:min-w-[240px]"
                            >
                                <div className="h-24 animate-pulse bg-gray-200/80 sm:h-28" />
                                <div className="p-3">
                                    <div className="h-3 w-24 animate-pulse rounded-full bg-gray-200/80" />
                                    <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-gray-200/70" />
                                    <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-gray-200/80" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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

        </div>
    );
};

export default CategoryPage;
