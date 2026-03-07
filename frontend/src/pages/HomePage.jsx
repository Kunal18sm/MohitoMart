import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/ProductCard';
import ShopCard from '../components/ShopCard';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import {
    buildAreaQueryParam,
    buildAreasFromSlots,
    fillAreaSlotsWithNearby,
    formatAreaSummary,
    getAreaFilterState,
    persistAreaFilterState,
} from '../utils/areaFilters';
import {
    filterCategoriesWithLocalImages,
    getCategoryLocalImage,
    handleCategoryImageError,
} from '../utils/categoryImage';
import { applyImageFallback, resolveImageSource } from '../utils/imageFallbacks';
import SuggestionInput from '../components/SuggestionInput';

const readStoredLocation = () => {
    let storedLocation = {};
    try {
        storedLocation = JSON.parse(localStorage.getItem('selectedLocation') || '{}');
    } catch (error) {
        storedLocation = {};
    }

    return {
        city: String(storedLocation.city || localStorage.getItem('user_city') || '').trim(),
        area: String(storedLocation.area || localStorage.getItem('user_area') || '').trim(),
    };
};

const areAreasEqual = (left = [], right = []) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const HOME_FEED_PAGE_SIZE = 20;

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

const toAreaKey = (value) => String(value || '').trim().toLowerCase();

const prioritizeNearbyAreas = (primaryArea, options = []) => {
    const uniqueOptions = [];
    const seenKeys = new Set();

    options.forEach((entry) => {
        const normalized = String(entry || '').trim();
        const key = toAreaKey(normalized);
        if (!key || seenKeys.has(key)) {
            return;
        }

        seenKeys.add(key);
        uniqueOptions.push(normalized);
    });

    const primaryKey = toAreaKey(primaryArea);
    const primaryIndex = uniqueOptions.findIndex((entry) => toAreaKey(entry) === primaryKey);

    if (primaryIndex < 0) {
        return uniqueOptions;
    }

    const prioritized = [];
    for (let offset = 1; offset < uniqueOptions.length; offset += 1) {
        const rightIndex = primaryIndex + offset;
        if (rightIndex < uniqueOptions.length) {
            prioritized.push(uniqueOptions[rightIndex]);
        }

        const leftIndex = primaryIndex - offset;
        if (leftIndex >= 0) {
            prioritized.push(uniqueOptions[leftIndex]);
        }
    }

    return prioritized;
};

const HomePage = () => {
    const { t } = useTranslation();
    const { showError } = useFlash();
    const [selectedLocation, setSelectedLocation] = useState(() => readStoredLocation());
    const currentUserRole = useMemo(() => {
        try {
            const storedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            return storedProfile?.role || 'user';
        } catch (error) {
            return 'user';
        }
    }, []);
    const isShopOwnerUser = useMemo(
        () => Boolean(localStorage.getItem('authToken')) && currentUserRole === 'shop_owner',
        [currentUserRole]
    );
    const initialAreaFilterState = useMemo(
        () => getAreaFilterState(selectedLocation),
        [selectedLocation.area, selectedLocation.city]
    );

    const [activeSlide, setActiveSlide] = useState(0);
    const [bannerImages, setBannerImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [followedProducts, setFollowedProducts] = useState([]);
    const [feedProducts, setFeedProducts] = useState([]);
    const [randomServices, setRandomServices] = useState([]);
    const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
    const [topRatedShops, setTopRatedShops] = useState([]);
    const [latestProducts, setLatestProducts] = useState([]);
    const [areaSlots, setAreaSlots] = useState(() => [
        initialAreaFilterState.primaryArea || '',
        initialAreaFilterState.areas[1] || '',
        initialAreaFilterState.areas[2] || '',
    ]);
    const [activeAreas, setActiveAreas] = useState(() => initialAreaFilterState.areas);
    const [loadingFollowed, setLoadingFollowed] = useState(false);
    const [loadingFeed, setLoadingFeed] = useState(false);
    const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);
    const [loadingRandomServices, setLoadingRandomServices] = useState(false);
    const [loadingRecentlyViewed, setLoadingRecentlyViewed] = useState(false);
    const [loadingTopRatedShops, setLoadingTopRatedShops] = useState(false);
    const [loadingLatestProducts, setLoadingLatestProducts] = useState(false);
    const [feedCurrentPage, setFeedCurrentPage] = useState(1);
    const [hasMoreFeed, setHasMoreFeed] = useState(false);
    const { getAreaOptionsByCity } = useLocationSuggestions();
    const feedLoadTriggerRef = useRef(null);
    const feedRequestIdRef = useRef(0);

    const nearbyAreaOptions = useMemo(
        () => getAreaOptionsByCity(selectedLocation.city || ''),
        [getAreaOptionsByCity, selectedLocation.city]
    );
    const prioritizedNearbyAreaOptions = useMemo(
        () => prioritizeNearbyAreas(selectedLocation.area, nearbyAreaOptions),
        [nearbyAreaOptions, selectedLocation.area]
    );
    const areaSummary = useMemo(() => formatAreaSummary(activeAreas), [activeAreas]);
    const activeAreasQuery = useMemo(() => buildAreaQueryParam(activeAreas), [activeAreas]);

    useEffect(() => {
        const syncLocation = () => {
            const latestLocation = readStoredLocation();
            setSelectedLocation((previous) =>
                previous.city === latestLocation.city && previous.area === latestLocation.area
                    ? previous
                    : latestLocation
            );
        };

        window.addEventListener('storage', syncLocation);
        window.addEventListener('app:location-updated', syncLocation);

        return () => {
            window.removeEventListener('storage', syncLocation);
            window.removeEventListener('app:location-updated', syncLocation);
        };
    }, []);

    useEffect(() => {
        const nextAreaFilterState = getAreaFilterState(selectedLocation);
        const nextAreas = fillAreaSlotsWithNearby(
            selectedLocation,
            nextAreaFilterState.areas.slice(1),
            prioritizedNearbyAreaOptions,
            3
        );
        const nextSlots = [
            nextAreas[0] || '',
            nextAreas[1] || '',
            nextAreas[2] || '',
        ];

        setActiveAreas((previous) => (areAreasEqual(previous, nextAreas) ? previous : nextAreas));
        setAreaSlots((previous) =>
            previous.join('|') === nextSlots.join('|') ? previous : nextSlots
        );

        if (!areAreasEqual(nextAreaFilterState.areas, nextAreas)) {
            persistAreaFilterState(selectedLocation, nextAreas);
        }
    }, [prioritizedNearbyAreaOptions, selectedLocation.area, selectedLocation.city]);

    useEffect(() => {
        if (bannerImages.length <= 1) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setActiveSlide((previous) => (previous + 1) % bannerImages.length);
        }, 4500);

        return () => window.clearInterval(timer);
    }, [bannerImages.length]);

    const fetchHomeBanners = async () => {
        try {
            const { data } = await api.get('/banners/home');
            const images = Array.isArray(data.images) ? data.images.filter(Boolean).slice(0, 3) : [];

            if (images.length) {
                setBannerImages(images);
                setActiveSlide(0);
            } else {
                setBannerImages([]);
            }
        } catch (error) {
            setBannerImages([]);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/shops/categories');
            setCategories(filterCategoriesWithLocalImages(data.categories || []));
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load categories'));
        }
    };

    const fetchFollowedRandomProducts = async (areas = activeAreas) => {
        if (!localStorage.getItem('authToken')) {
            setFollowedProducts([]);
            return;
        }

        try {
            setLoadingFollowed(true);
            const { data } = await api.get('/users/feed/followed/random', {
                params: {
                    limit: 25,
                    city: selectedLocation.city || undefined,
                    areas: buildAreaQueryParam(areas),
                },
            });
            setFollowedProducts(data.products || []);
        } catch (error) {
            setFollowedProducts([]);
        } finally {
            setLoadingFollowed(false);
        }
    };

    const fetchFeedProductsPage = useCallback(
        async (targetPage = 1, { reset = false, areas = activeAreas } = {}) => {
            const requestId = feedRequestIdRef.current + 1;
            feedRequestIdRef.current = requestId;

            try {
                if (reset) {
                    setLoadingFeed(true);
                    setLoadingMoreFeed(false);
                } else {
                    setLoadingMoreFeed(true);
                }

                const { data } = await api.get('/products', {
                    params: {
                        page: targetPage,
                        limit: HOME_FEED_PAGE_SIZE,
                        sort: 'latest',
                        city: selectedLocation.city || undefined,
                        areas: buildAreaQueryParam(areas),
                    },
                });

                if (requestId !== feedRequestIdRef.current) {
                    return;
                }

                const nextProducts = Array.isArray(data.products) ? data.products : [];
                const totalPages = Math.max(Number(data.pages || 0), 0);

                setFeedProducts((previous) =>
                    reset ? nextProducts : mergeProductsById(previous, nextProducts)
                );
                setFeedCurrentPage(targetPage);
                setHasMoreFeed(targetPage < totalPages);
            } catch (error) {
                if (requestId !== feedRequestIdRef.current) {
                    return;
                }

                if (reset) {
                    setFeedProducts([]);
                    setFeedCurrentPage(1);
                }
                setHasMoreFeed(false);
                showError(extractErrorMessage(error, 'Unable to load nearby products'));
            } finally {
                if (requestId === feedRequestIdRef.current) {
                    setLoadingFeed(false);
                    setLoadingMoreFeed(false);
                }
            }
        },
        [activeAreas, selectedLocation.city, showError]
    );

    const loadMoreFeedProducts = useCallback(() => {
        if (!hasMoreFeed || loadingFeed || loadingMoreFeed) {
            return;
        }

        fetchFeedProductsPage(feedCurrentPage + 1, {
            areas: activeAreas,
        });
    }, [
        activeAreas,
        feedCurrentPage,
        fetchFeedProductsPage,
        hasMoreFeed,
        loadingFeed,
        loadingMoreFeed,
    ]);

    const fetchRecentlyViewedProducts = async (areas = activeAreas) => {
        if (!localStorage.getItem('authToken')) {
            setRecentlyViewedProducts([]);
            return;
        }

        try {
            setLoadingRecentlyViewed(true);
            const { data } = await api.get('/products/recently-viewed', {
                params: {
                    limit: 12,
                    city: selectedLocation.city || undefined,
                    areas: buildAreaQueryParam(areas),
                },
            });
            setRecentlyViewedProducts(data.products || []);
        } catch (error) {
            setRecentlyViewedProducts([]);
        } finally {
            setLoadingRecentlyViewed(false);
        }
    };

    const fetchTopRatedShops = async (areas = activeAreas) => {
        try {
            setLoadingTopRatedShops(true);
            const { data } = await api.get('/shops', {
                params: {
                    page: 1,
                    limit: 10,
                    sort: 'rating_desc',
                    city: selectedLocation.city || undefined,
                    areas: buildAreaQueryParam(areas),
                },
            });
            setTopRatedShops(data.shops || []);
        } catch (error) {
            setTopRatedShops([]);
        } finally {
            setLoadingTopRatedShops(false);
        }
    };

    const fetchLatestProducts = async (areas = activeAreas) => {
        try {
            setLoadingLatestProducts(true);
            const { data } = await api.get('/products/latest', {
                params: {
                    limit: 12,
                    city: selectedLocation.city || undefined,
                    areas: buildAreaQueryParam(areas),
                },
            });
            setLatestProducts(data.products || []);
        } catch (error) {
            setLatestProducts([]);
        } finally {
            setLoadingLatestProducts(false);
        }
    };

    const fetchRandomServices = async (areas = activeAreas) => {
        try {
            setLoadingRandomServices(true);
            const { data } = await api.get('/services/random', {
                params: {
                    limit: 20,
                    city: selectedLocation.city || undefined,
                    areas: buildAreaQueryParam(areas),
                },
            });
            setRandomServices(data.services || []);
        } catch (error) {
            setRandomServices([]);
        } finally {
            setLoadingRandomServices(false);
        }
    };

    useEffect(() => {
        fetchHomeBanners();
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchFollowedRandomProducts(activeAreas);
        fetchRecentlyViewedProducts(activeAreas);
        fetchTopRatedShops(activeAreas);
        fetchLatestProducts(activeAreas);
        fetchFeedProductsPage(1, {
            reset: true,
            areas: activeAreas,
        });
        fetchRandomServices(activeAreas);
    }, [activeAreas, activeAreasQuery, fetchFeedProductsPage, selectedLocation.city]);

    useEffect(() => {
        if (!hasMoreFeed || loadingFeed || loadingMoreFeed) {
            return undefined;
        }

        const triggerElement = feedLoadTriggerRef.current;
        if (!triggerElement) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries, attachedObserver) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }

                attachedObserver.disconnect();
                loadMoreFeedProducts();
            },
            {
                root: null,
                rootMargin: '500px 0px',
                threshold: 0.01,
            }
        );

        observer.observe(triggerElement);
        return () => observer.disconnect();
    }, [hasMoreFeed, loadMoreFeedProducts, loadingFeed, loadingMoreFeed, feedProducts.length]);

    const updateAreaSlot = (index, value) => {
        setAreaSlots((previous) => {
            const nextSlots = [...previous];
            nextSlots[index] = value;
            return nextSlots;
        });
    };

    const applyAreaFilters = () => {
        const manuallySelectedAreas = buildAreasFromSlots(selectedLocation, [areaSlots[1], areaSlots[2]]);
        const nextAreas = fillAreaSlotsWithNearby(
            selectedLocation,
            manuallySelectedAreas.slice(1),
            prioritizedNearbyAreaOptions,
            3
        );
        const primaryArea = nextAreas[0] || initialAreaFilterState.primaryArea || '';

        setActiveAreas(nextAreas);
        setAreaSlots([primaryArea, nextAreas[1] || '', nextAreas[2] || '']);
        persistAreaFilterState(selectedLocation, nextAreas);
    };

    return (
        <div className="pb-12">
            <section className="container mx-auto px-4 py-4 md:py-8">
                <div className="relative mx-auto w-full max-w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.1)] backdrop-blur md:max-w-[760px]">
                    {bannerImages.length > 0 ? (
                        <>
                            <div
                                className="flex transition-transform duration-700 ease-out"
                                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                            >
                                {bannerImages.map((image, index) => (
                                    <div key={`${image}-${index}`} className="relative min-w-full aspect-[16/9]">
                                        <img
                                            src={image}
                                            alt={`banner-${index + 1}`}
                                            loading={index === 0 ? 'eager' : 'lazy'}
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                                {bannerImages.map((image, index) => (
                                    <button
                                        key={`${image}-dot-${index}`}
                                        type="button"
                                        onClick={() => setActiveSlide(index)}
                                        aria-label={`Show banner ${index + 1}`}
                                        className={`h-2.5 w-7 rounded-full transition ${index === activeSlide ? 'bg-white' : 'bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex aspect-[16/9] items-center justify-center text-sm font-semibold text-gray-500">
                            {t('nothing_to_show') || 'Nothing to show'}
                        </div>
                    )}
                </div>
            </section>

            <section className="container mx-auto px-4 pb-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {t('select_more_areas_near_you') || 'Select more areas near you'}
                </p>
                <div className="rounded-xl border border-gray-200 bg-white/90 p-2 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="hidden sm:block">
                            <span className="inline-flex items-center rounded-full border border-slate-300/70 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-dark">
                                {`${t('area') || 'Area'} ${activeAreas.length || 0}/3`}
                            </span>
                        </div>

                        <div className="min-w-0 flex-[0.9]">
                            <input
                                value={areaSlots[0] || (t('not_set') || 'Not set')}
                                disabled
                                aria-label={t('primary_area') || 'Primary area'}
                                className="h-[34px] w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 text-[11px] font-medium text-gray-600"
                            />
                        </div>

                        <div className="min-w-0 flex-1 transition-[flex] duration-200 focus-within:flex-[1.5]">
                            <SuggestionInput
                                value={areaSlots[1]}
                                onChange={(nextValue) => updateAreaSlot(1, nextValue)}
                                ariaLabel={t('nearby_area_one') || 'Nearby area 1'}
                                placeholder="A1"
                                maxLength={70}
                                options={nearbyAreaOptions}
                                className="h-[34px] w-full rounded-md border border-gray-200 px-2.5 text-[11px] outline-none focus:border-primary"
                            />
                        </div>

                        <div className="min-w-0 flex-1 transition-[flex] duration-200 focus-within:flex-[1.5]">
                            <SuggestionInput
                                value={areaSlots[2]}
                                onChange={(nextValue) => updateAreaSlot(2, nextValue)}
                                ariaLabel={t('nearby_area_two') || 'Nearby area 2'}
                                placeholder="A2"
                                maxLength={70}
                                options={nearbyAreaOptions}
                                className="h-[34px] w-full rounded-md border border-gray-200 px-2.5 text-[11px] outline-none focus:border-primary"
                            />
                        </div>

                        <button
                            onClick={applyAreaFilters}
                            type="button"
                            className="h-[34px] shrink-0 whitespace-nowrap rounded-[10px] bg-dark px-3 text-xs font-bold text-white transition hover:bg-primary-dark sm:px-4 sm:text-sm"
                        >
                            <span className="sm:hidden">{t('go') || 'Go'}</span>
                            <span className="hidden sm:inline">{t('apply') || 'Apply'}</span>
                        </button>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-4">
                {isShopOwnerUser && (
                    <div className="mb-8 flex flex-wrap items-center gap-2">
                        <Link
                            to="/owner/products/new"
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[14px] bg-gradient-to-br from-dark to-slate-800 px-4 py-2 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(15,23,42,0.22)] transition hover:from-slate-900 hover:to-gray-900"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
                            </svg>
                            {t('add_item') || 'Add Item'}
                        </Link>
                        <Link
                            to="/owner/products"
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[14px] border border-dark/20 bg-white/95 px-4 py-2 text-sm font-extrabold text-dark shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-dark/30"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                            </svg>
                            {t('all_products') || 'All Products'}
                        </Link>
                    </div>
                )}
                <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="whitespace-nowrap text-lg font-black text-dark sm:text-2xl">
                            {t('categories') || 'Browse Categories'}
                        </h2>
                        <Link
                            to="/categories"
                            className="shrink-0 px-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
                        >
                            {t('all') || 'All'}
                        </Link>
                    </div>
                    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
                        <Link
                            to="/shops/all"
                            className="inline-flex items-center gap-1 rounded-full border border-dark/20 bg-white/85 px-3 py-1.5 text-xs font-bold text-dark transition hover:bg-white"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18l-1.2 9.2A2 2 0 0 1 17.8 21H6.2a2 2 0 0 1-2-1.8L3 10Zm2-6h14l2 6H3l2-6Z" />
                            </svg>
                            {t('all_shops') || 'All shops'}
                        </Link>
                        <Link
                            to="/services/all"
                            className="inline-flex items-center gap-1 rounded-full border border-dark/20 bg-white/85 px-3 py-1.5 text-xs font-bold text-dark transition hover:bg-white"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3h2v4h-2zM4.9 6.3 6.3 4.9l2.8 2.8-1.4 1.4ZM3 11h4v2H3zm14 1a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm2-1h2v2h-2zm-4 8h2v2h-2zM6.3 19.1 4.9 17.7l2.8-2.8 1.4 1.4Z" />
                            </svg>
                            {t('all_services') || 'All services'}
                        </Link>
                    </div>
                </div>
                <div className="flex flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-2">
                    {categories.map((category) => (
                        <div key={category} className="shrink-0">
                            <Link
                                to={`/category/${encodeURIComponent(category.toLowerCase())}`}
                                className="group flex min-w-[72px] shrink-0 flex-col items-center text-center"
                            >
                                <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm transition group-hover:border-primary group-hover:shadow-md">
                                    <img
                                        src={getCategoryLocalImage(category)}
                                        alt={category}
                                        loading="lazy"
                                        decoding="async"
                                        onError={handleCategoryImageError}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                </div>
                                <p className="mt-1.5 line-clamp-2 max-w-[74px] text-[10px] font-semibold leading-tight text-gray-700">
                                    {category}
                                </p>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            <section className="container mx-auto px-4 py-8 md:py-10">
                <div className="rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8 border border-primary/20 shadow-lg relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-primary/20 text-primary-dark text-xs font-bold uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                                {t('your_feed') || 'Your Feed'}
                            </div>
                            <h2 className="text-2xl font-black text-dark sm:text-3xl">{t('followed_shops_updates') || 'Followed Shops Updates'}</h2>
                        </div>
                        {!localStorage.getItem('authToken') && (
                            <Link to="/auth" className="text-sm font-semibold text-primary hover:underline bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-sm">
                                {t('login_to_see_followed_feed') || 'Login to see followed feed'}
                            </Link>
                        )}
                    </div>

                    <div className="relative z-10">

                        {loadingFollowed && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {[...Array(4)].map((_, index) => (
                                    <div key={index} className="min-w-[44%] sm:min-w-[30%] md:min-w-[20%]">
                                        <Skeleton type="product" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loadingFollowed && followedProducts.length === 0 && (
                            <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                                {t('no_followed_products') || 'No products are available from followed shops yet. Follow shops to see their products here.'}
                            </p>
                        )}

                        {!loadingFollowed && followedProducts.length > 0 && (
                            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                                {followedProducts.map((product) => (
                                    <div
                                        key={product._id}
                                        className="min-w-[52%] shrink-0 snap-start sm:min-w-[35%] md:min-w-[240px] lg:min-w-[220px]"
                                    >
                                        <ProductCard product={product} compact desktopTall />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-4 md:py-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">{t('recently_viewed') || 'Recently Viewed'}</h2>
                    </div>
                    {!localStorage.getItem('authToken') && (
                        <Link to="/auth" className="text-sm font-semibold text-primary hover:underline">
                            {t('login_to_build_viewed_list') || 'Login to build your viewed list'}
                        </Link>
                    )}
                </div>

                {loadingRecentlyViewed && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className="min-w-[44%] sm:min-w-[30%] md:min-w-[20%]">
                                <Skeleton type="product" />
                            </div>
                        ))}
                    </div>
                )}

                {!loadingRecentlyViewed &&
                    localStorage.getItem('authToken') &&
                    recentlyViewedProducts.length === 0 && (
                        <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                            {t('recently_viewed_empty') || 'Your recently viewed products list is currently empty.'}
                        </p>
                    )}

                {!loadingRecentlyViewed && recentlyViewedProducts.length > 0 && (
                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                        {recentlyViewedProducts.map((product) => (
                            <div
                                key={product._id}
                                className="min-w-[52%] shrink-0 snap-start sm:min-w-[35%] md:min-w-[240px] lg:min-w-[220px]"
                            >
                                <ProductCard product={product} compact desktopTall />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="container mx-auto px-4 py-4 md:py-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">
                            {t('top_rated_shops_near_you') || 'Top Rated Shops Near You'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {selectedLocation.city && activeAreas.length
                                ? `${t('sorted_by_rating_in') || 'Sorted by rating in'} ${areaSummary}, ${selectedLocation.city}`
                                : t('sorted_by_best_ratings') || 'Sorted by best ratings across all shops'}
                        </p>
                    </div>
                </div>

                {loadingTopRatedShops && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[...Array(3)].map((_, index) => (
                            <div key={index} className="min-w-[62%] sm:min-w-[45%] md:min-w-[280px]">
                                <div className="h-[260px] animate-pulse rounded-2xl bg-gray-200" />
                            </div>
                        ))}
                    </div>
                )}

                {!loadingTopRatedShops && topRatedShops.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                        {t('nearby_top_rated_shops_not_available') || 'Nearby top-rated shops are not available right now.'}
                    </p>
                )}

                {!loadingTopRatedShops && topRatedShops.length > 0 && (
                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                        {topRatedShops.map((shop) => (
                            <div
                                key={shop._id}
                                className="min-w-[62%] shrink-0 snap-start sm:min-w-[45%] md:min-w-[280px]"
                            >
                                <ShopCard shop={shop} />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {!loadingRandomServices && randomServices.length > 0 && (
                <section className="container mx-auto px-4 py-2 md:py-4">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black text-dark sm:text-2xl">
                                {t('services_near_you') || 'Services Near You'}
                            </h2>

                        </div>
                    </div>

                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                        {randomServices.map((service) => (
                            <Link
                                key={service._id}
                                to={`/service/${service._id}`}
                                className="group min-w-[50%] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:min-w-[34%] md:min-w-[220px] lg:min-w-[200px]"
                            >
                                <img
                                    src={resolveImageSource(service.images?.[0], 'service')}
                                    alt={service.name}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(event) => applyImageFallback(event, 'service')}
                                    className="h-20 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-24"
                                />
                                <div className="p-2.5">
                                    <h3 className="line-clamp-1 text-sm font-black text-dark">
                                        {service.name}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <section className="container mx-auto px-4 py-4">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">
                            {t('newly_added_products') || 'Newly Added Products'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {t('fresh_listings_nearby') || 'Fresh listings from nearby shops.'}
                        </p>
                    </div>
                </div>

                {loadingLatestProducts && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {[...Array(8)].map((_, index) => (
                            <Skeleton key={index} type="product" />
                        ))}
                    </div>
                )}

                {!loadingLatestProducts && latestProducts.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                        {t('newly_added_products_not_available') || 'Newly added products are not available right now.'}
                    </p>
                )}

                {!loadingLatestProducts && latestProducts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {latestProducts.map((product) => (
                            <ProductCard key={product._id} product={product} desktopTall />
                        ))}
                    </div>
                )}
            </section>

            <section className="container mx-auto px-4 py-4">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">
                            {t('available_in_nearby_shops') || 'Available in your nearby shops'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {selectedLocation.city && activeAreas.length
                                ? `${t('showing_for') || 'Showing for'} ${areaSummary}, ${selectedLocation.city}`
                                : t('showing_products_all_shops') || 'Showing products from all available shops'}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/85 px-2.5 py-1 text-xs font-bold text-dark">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7v7H4zM13 5h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                        </svg>
                        {selectedLocation.city && activeAreas.length
                            ? `${activeAreas.length}-${t('area_feed') || 'area feed'}`
                            : t('all_city_feed') || 'All-city feed'}
                    </span>
                </div>

                {loadingFeed && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {[...Array(8)].map((_, index) => (
                            <Skeleton key={index} type="product" />
                        ))}
                    </div>
                )}

                {!loadingFeed && feedProducts.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                        {t('nearby_products_not_available') || 'Nearby products are not available right now.'}
                    </p>
                )}

                {!loadingFeed && feedProducts.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {feedProducts.map((product) => (
                                <ProductCard key={product._id} product={product} desktopTall />
                            ))}
                        </div>

                        {loadingMoreFeed && (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {[...Array(5)].map((_, index) => (
                                    <Skeleton key={`feed-loading-${index}`} type="product" />
                                ))}
                            </div>
                        )}

                        <div
                            ref={feedLoadTriggerRef}
                            className="h-8"
                            aria-hidden="true"
                        />

                        {hasMoreFeed && !loadingMoreFeed && (
                            <p className="text-center text-xs font-medium text-gray-500">
                                {t('scroll_to_load_more_products') || 'Scroll to load more products'}
                            </p>
                        )}

                        {!hasMoreFeed && !loadingMoreFeed && (
                            <p className="text-center text-xs font-medium text-gray-500">
                                {t('end_of_feed') || 'You have reached the end of this feed.'}
                            </p>
                        )}
                    </>
                )}

                {loadingFeed && (
                    <div
                        ref={feedLoadTriggerRef}
                        className="h-8"
                        aria-hidden="true"
                    />
                )}
            </section>
        </div>
    );
};

export default HomePage;
