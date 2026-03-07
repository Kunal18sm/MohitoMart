import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { filterCategoriesWithLocalImages } from '../utils/categoryImage';
import { buildAreaQueryParam, formatAreaSummary, getAreaFilterState } from '../utils/areaFilters';
import { applyImageFallback, resolveImageSource } from '../utils/imageFallbacks';

const PAGE_SIZE = 20;
const mergeUniqueShops = (existingShops = [], incomingShops = []) => {
    const mergedShops = [...existingShops];
    const seenShopIds = new Set(existingShops.map((entry) => String(entry?._id || '')).filter(Boolean));

    incomingShops.forEach((entry) => {
        const shopId = String(entry?._id || '');
        if (!shopId || seenShopIds.has(shopId)) {
            return;
        }

        seenShopIds.add(shopId);
        mergedShops.push(entry);
    });

    return mergedShops;
};

const AllShopsPage = () => {
    const { t } = useTranslation();
    const { showError } = useFlash();
    const storedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );
    const areaFilterState = useMemo(
        () => getAreaFilterState(storedLocation),
        [storedLocation]
    );
    const areaSummary = useMemo(
        () => formatAreaSummary(areaFilterState.areas),
        [areaFilterState.areas]
    );
    const locationBadgeLabel = useMemo(() => {
        if (!areaFilterState.city || !areaFilterState.areas.length) {
            return t('all_locations') || 'All locations';
        }

        return `${areaSummary}, ${areaFilterState.city}`;
    }, [areaFilterState.areas.length, areaFilterState.city, areaSummary, t]);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [categories, setCategories] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const requestIdRef = useRef(0);

    const fetchShopsPage = useCallback(
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

                const params = {
                    city: areaFilterState.city || undefined,
                    areas: buildAreaQueryParam(areaFilterState.areas),
                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                    keyword: keyword.trim() || undefined,
                    sort: sortBy,
                    page: targetPage,
                    limit: PAGE_SIZE,
                };

                const { data } = await api.get('/shops', { params });
                if (requestId !== requestIdRef.current) {
                    return;
                }

                const nextShops = Array.isArray(data.shops) ? data.shops : [];
                const totalPages = Number(data.pages || 1);

                setShops((previous) =>
                    reset ? nextShops : mergeUniqueShops(previous, nextShops)
                );
                setCurrentPage(targetPage);
                setHasMore(targetPage < totalPages);
            } catch (error) {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                if (reset) {
                    setShops([]);
                }
                showError(extractErrorMessage(error, t('unable_load_listed_shops') || 'Unable to load listed shops'));
            } finally {
                if (requestId === requestIdRef.current) {
                    if (reset) {
                        setLoading(false);
                    } else {
                        setLoadingMore(false);
                    }
                }
            }
        },
        [
            areaFilterState.areas,
            areaFilterState.city,
            keyword,
            selectedCategory,
            showError,
            sortBy,
            t,
        ]
    );

    const fetchCategories = useCallback(async () => {
        try {
            const { data } = await api.get('/shops/categories');
            setCategories(filterCategoriesWithLocalImages(data.categories || []));
        } catch (error) {
            setCategories([]);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
        fetchShopsPage(1, { reset: true });
    }, []);

    const applyLocation = (event) => {
        event.preventDefault();
        fetchShopsPage(1, { reset: true });
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) {
            return;
        }

        fetchShopsPage(currentPage + 1);
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="mb-2 text-sm text-gray-500">{t('browse_all_listed_shops') || 'Browse all listed shops'}</p>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">{t('all_listed_shops') || 'All Listed Shops'}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/90 px-2.5 py-1 text-xs font-bold text-dark">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18l-1.2 9.2A2 2 0 0 1 17.8 21H6.2a2 2 0 0 1-2-1.8L3 10Zm2-6h14l2 6H3l2-6Z" />
                        </svg>
                        {selectedCategory === 'all'
                            ? locationBadgeLabel
                            : `${selectedCategory} | ${locationBadgeLabel}`}
                    </span>
                </div>
            </div>

            <form
                onSubmit={applyLocation}
                className="mb-4 grid gap-2 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm md:grid-cols-4"
            >
                <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    aria-label={t('shop_category_filter') || 'Filter shops by category'}
                    className="rounded-md border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-primary"
                >
                    <option value="all">{t('all') || 'All'}</option>
                    {categories.map((category) => (
                        <option value={category} key={category}>
                            {category}
                        </option>
                    ))}
                </select>
                <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    aria-label={t('search_shop_name') || 'Search shop name'}
                    placeholder={t('search_shop_name') || 'Search shop name'}
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    aria-label={t('shop_sort_order') || 'Sort shops'}
                    className="rounded-md border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-primary"
                >
                    <option value="latest">{t('latest') || 'Latest'}</option>
                    <option value="oldest">{t('oldest') || 'Oldest'}</option>
                    <option value="rating_desc">{t('top_rated') || 'Top rated'}</option>
                    <option value="name_asc">{t('name_a_to_z') || 'Name A-Z'}</option>
                </select>
                <button
                    type="submit"
                    className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md bg-dark px-4 text-sm font-bold text-white transition hover:bg-primary-dark"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4 21 6-6m0 0 2.4 2.4M10 15V3m10 0v18m0 0-2.4-2.4M20 21l-6-6" />
                    </svg>
                    {t('apply') || 'Apply'}
                </button>
            </form>
            <p className="mb-4 text-[11px] text-gray-500">
                {t('area_filter_sync_home') || 'Area filter is synced with the Home page area feed selection.'}
            </p>

            {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {[...Array(10)].map((_, index) => (
                        <div
                            key={index}
                            className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                        />
                    ))}
                </div>
            )}

            {!loading && shops.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                    {selectedCategory === 'all'
                        ? t('no_shop_for_location') || 'No shop is currently listed for this location.'
                        : `${t('no_shop_for_category_prefix') || 'No'} "${selectedCategory}" ${t('no_shop_for_category_suffix') || 'shop is listed in this location.'}`}
                </p>
            )}

            {!loading && shops.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {shops.map((shop) => (
                            <div key={shop._id}>
                                <Link
                                    to={`/shop/${shop._id}`}
                                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <img
                                        src={resolveImageSource(shop.images?.[0], 'shop')}
                                        alt={shop.name}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => applyImageFallback(event, 'shop')}
                                        className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-36"
                                    />
                                    <div className="space-y-1.5 p-3">
                                        <h2 className="line-clamp-1 text-sm font-black text-dark sm:text-base">
                                            {shop.name}
                                        </h2>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            {shop.category}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-bold text-dark transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loadingMore ? (t('loading') || 'Loading...') : (t('load_more_shops') || 'Load more shops')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AllShopsPage;
