import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { filterCategoriesWithLocalImages } from '../utils/categoryImage';
import { buildAreaQueryParam, formatAreaSummary, getAreaFilterState } from '../utils/areaFilters';

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
    const { showError, showSuccess } = useFlash();
    const storedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );
    const areaFilterState = useMemo(
        () => getAreaFilterState(storedLocation),
        [storedLocation]
    );
    const [isAdmin, setIsAdmin] = useState(false);
    const effectiveAreaFilterState = useMemo(
        () => (isAdmin ? { city: '', areas: [] } : areaFilterState),
        [areaFilterState, isAdmin]
    );
    const areaSummary = useMemo(
        () => formatAreaSummary(effectiveAreaFilterState.areas),
        [effectiveAreaFilterState.areas]
    );
    const locationBadgeLabel = useMemo(() => {
        if (!effectiveAreaFilterState.city || !effectiveAreaFilterState.areas.length) {
            return t('all_locations') || 'All locations';
        }

        return `${areaSummary}, ${effectiveAreaFilterState.city}`;
    }, [areaSummary, effectiveAreaFilterState.areas.length, effectiveAreaFilterState.city, t]);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [categories, setCategories] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [shopToDelete, setShopToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
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
                    city: effectiveAreaFilterState.city || undefined,
                    areas: buildAreaQueryParam(effectiveAreaFilterState.areas),
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
            effectiveAreaFilterState.areas,
            effectiveAreaFilterState.city,
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
    }, [fetchShopsPage, fetchCategories]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setIsAdmin(false);
            return;
        }

        let active = true;
        api.get('/users/profile')
            .then(({ data }) => {
                if (active) {
                    setIsAdmin(data.role === 'admin');
                }
            })
            .catch(() => {
                if (active) {
                    setIsAdmin(false);
                }
            });

        return () => {
            active = false;
        };
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

    const requestDeleteShop = (shop) => {
        setShopToDelete(shop);
    };

    const cancelDeleteShop = () => {
        if (deleteLoading) {
            return;
        }
        setShopToDelete(null);
    };

    const confirmDeleteShop = async () => {
        if (!shopToDelete || deleteLoading) {
            return;
        }

        try {
            setDeleteLoading(true);
            await api.delete(`/shops/${shopToDelete._id}`);
            setShops((previous) => previous.filter((entry) => entry._id !== shopToDelete._id));
            showSuccess('Shop deleted successfully');
            setShopToDelete(null);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to delete shop'));
        } finally {
            setDeleteLoading(false);
        }
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
            {!isAdmin && (
                <p className="mb-4 text-[11px] text-gray-500">
                    {t('area_filter_sync_home') || 'Area filter is synced with the Home page area feed selection.'}
                </p>
            )}

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
                            <div key={shop._id} className="relative">
                                <Link
                                    to={`/shop/${shop._id}`}
                                    className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <AdaptiveCardImage
                                        source={shop.images?.[0]}
                                        alt={shop.name}
                                        kind="shop"
                                        responsiveOptions={{
                                            width: 420,
                                            widths: [180, 240, 320, 420],
                                            sizes:
                                                '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
                                        }}
                                        containerClassName="h-32 bg-white/40 sm:h-36"
                                        fillContainer
                                        className="rounded-t-2xl"
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
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            requestDeleteShop(shop);
                                        }}
                                        className="absolute right-2 top-2 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                )}
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

            {shopToDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-black text-dark">Delete shop?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            This will remove{' '}
                            <span className="font-semibold text-dark">{shopToDelete.name}</span> and all its products.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={cancelDeleteShop}
                                disabled={deleteLoading}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteShop}
                                disabled={deleteLoading}
                                className="rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllShopsPage;
