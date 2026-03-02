import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@mui/material';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WindowRoundedIcon from '@mui/icons-material/WindowRounded';
import MiscellaneousServicesRoundedIcon from '@mui/icons-material/MiscellaneousServicesRounded';
import { motion } from 'framer-motion';
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
    formatAreaSummary,
    getAreaFilterState,
    persistAreaFilterState,
} from '../utils/areaFilters';
import {
    filterCategoriesWithLocalImages,
    getCategoryLocalImage,
    handleCategoryImageError,
} from '../utils/categoryImage';
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

const sectionMotion = {
    initial: { opacity: 1, y: 0 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.45, ease: 'easeOut' },
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
    const [randomProducts, setRandomProducts] = useState([]);
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
    const [loadingRandom, setLoadingRandom] = useState(false);
    const [loadingRandomServices, setLoadingRandomServices] = useState(false);
    const [loadingRecentlyViewed, setLoadingRecentlyViewed] = useState(false);
    const [loadingTopRatedShops, setLoadingTopRatedShops] = useState(false);
    const [loadingLatestProducts, setLoadingLatestProducts] = useState(false);
    const { getAreaOptionsByCity } = useLocationSuggestions();

    const nearbyAreaOptions = useMemo(
        () => getAreaOptionsByCity(selectedLocation.city || ''),
        [getAreaOptionsByCity, selectedLocation.city]
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
        const nextAreas = nextAreaFilterState.areas;
        const nextSlots = [
            nextAreaFilterState.primaryArea || '',
            nextAreas[1] || '',
            nextAreas[2] || '',
        ];

        setActiveAreas((previous) => (areAreasEqual(previous, nextAreas) ? previous : nextAreas));
        setAreaSlots((previous) =>
            previous.join('|') === nextSlots.join('|') ? previous : nextSlots
        );
    }, [selectedLocation.area, selectedLocation.city]);

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

    const fetchRandomProducts = async (areas = activeAreas) => {
        try {
            setLoadingRandom(true);
            const { data } = await api.get('/products/random', {
                params: {
                    limit: 16,
                    city: selectedLocation.city || undefined,
                    areas: buildAreaQueryParam(areas),
                },
            });
            setRandomProducts(data.products || []);
        } catch (error) {
            setRandomProducts([]);
            showError(extractErrorMessage(error, 'Unable to load random products'));
        } finally {
            setLoadingRandom(false);
        }
    };

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
        fetchRandomProducts(activeAreas);
        fetchRandomServices(activeAreas);
    }, [selectedLocation.city, activeAreasQuery]);

    const updateAreaSlot = (index, value) => {
        setAreaSlots((previous) => {
            const nextSlots = [...previous];
            nextSlots[index] = value;
            return nextSlots;
        });
    };

    const applyAreaFilters = () => {
        const nextAreas = buildAreasFromSlots(selectedLocation, [areaSlots[1], areaSlots[2]]);
        const primaryArea = initialAreaFilterState.primaryArea || nextAreas[0] || '';

        setActiveAreas(nextAreas);
        setAreaSlots([primaryArea, nextAreas[1] || '', nextAreas[2] || '']);
        persistAreaFilterState(selectedLocation, nextAreas);
    };

    return (
        <div className="pb-12">
            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4 md:py-8">
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
                                        className={`h-2.5 w-7 rounded-full transition ${index === activeSlide ? 'bg-white' : 'bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex aspect-[16/9] items-center justify-center text-sm font-semibold text-gray-500">
                            Nothing to show
                        </div>
                    )}
                </div>
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 pb-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Select more areas near you
                </p>
                <div className="rounded-xl border border-gray-200 bg-white/90 p-2 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="hidden sm:block">
                            <Chip
                                size="small"
                                label={`Area ${activeAreas.length || 0}/3`}
                                sx={{
                                    borderRadius: '999px',
                                    fontWeight: 700,
                                    color: 'var(--color-dark)',
                                    bgcolor: 'rgba(255,255,255,0.92)',
                                    border: '1px solid rgba(100,116,139,0.25)',
                                }}
                            />
                        </div>

                        <div className="min-w-0 flex-[0.9]">
                            <input
                                value={areaSlots[0] || 'Not set'}
                                disabled
                                className="h-[34px] w-full rounded-md border border-gray-200 bg-gray-100 px-2.5 text-[11px] font-medium text-gray-600"
                            />
                        </div>

                        <div className="min-w-0 flex-1 transition-[flex] duration-200 focus-within:flex-[1.5]">
                            <SuggestionInput
                                value={areaSlots[1]}
                                onChange={(nextValue) => updateAreaSlot(1, nextValue)}
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
                                placeholder="A2"
                                maxLength={70}
                                options={nearbyAreaOptions}
                                className="h-[34px] w-full rounded-md border border-gray-200 px-2.5 text-[11px] outline-none focus:border-primary"
                            />
                        </div>

                        <Button
                            onClick={applyAreaFilters}
                            variant="contained"
                            sx={{
                                borderRadius: '10px',
                                px: { xs: 1.1, sm: 1.6 },
                                textTransform: 'none',
                                fontWeight: 700,
                                minHeight: 34,
                                minWidth: 'auto',
                                whiteSpace: 'nowrap',
                                backgroundColor: 'var(--color-dark)',
                                flexShrink: 0,
                            }}
                        >
                            <span className="sm:hidden">Go</span>
                            <span className="hidden sm:inline">Apply</span>
                        </Button>
                    </div>
                </div>
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4">
                {isShopOwnerUser && (
                    <div className="mb-8 flex flex-wrap items-center gap-2">
                        <Button
                            component={Link}
                            to="/owner/products/new"
                            startIcon={<AddBoxRoundedIcon />}
                            sx={{
                                borderRadius: '14px',
                                px: 1.7,
                                py: 0.9,
                                textTransform: 'none',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                color: '#fff',
                                background: 'linear-gradient(135deg, var(--color-dark), #1f2937)',
                                boxShadow: '0 8px 22px rgba(15,23,42,0.22)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #0f172a, #111827)',
                                },
                            }}
                        >
                            Add Item
                        </Button>
                        <Button
                            component={Link}
                            to="/owner/products"
                            startIcon={<Inventory2RoundedIcon />}
                            sx={{
                                borderRadius: '14px',
                                px: 1.7,
                                py: 0.9,
                                textTransform: 'none',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                color: 'var(--color-dark)',
                                border: '1px solid rgba(15,23,42,0.14)',
                                backgroundColor: 'rgba(255,255,255,0.96)',
                                boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,1)',
                                    border: '1px solid rgba(15,23,42,0.2)',
                                },
                            }}
                        >
                            All Products
                        </Button>
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
                            All
                        </Link>
                    </div>
                    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
                        <Button
                            component={Link}
                            to="/shops/all"
                            size="small"
                            startIcon={<StorefrontRoundedIcon />}
                            sx={{
                                borderRadius: '999px',
                                px: 1.35,
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.76rem',
                                whiteSpace: 'nowrap',
                                minWidth: 'auto',
                                color: 'var(--color-dark)',
                                border: '1px solid rgba(15,23,42,0.16)',
                                backgroundColor: 'rgba(255,255,255,0.85)',
                            }}
                        >
                            All shops
                        </Button>
                        <Button
                            component={Link}
                            to="/services/all"
                            size="small"
                            startIcon={<MiscellaneousServicesRoundedIcon />}
                            sx={{
                                borderRadius: '999px',
                                px: 1.35,
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.76rem',
                                whiteSpace: 'nowrap',
                                minWidth: 'auto',
                                color: 'var(--color-dark)',
                                border: '1px solid rgba(15,23,42,0.16)',
                                backgroundColor: 'rgba(255,255,255,0.85)',
                            }}
                        >
                            All services
                        </Button>
                    </div>
                </div>
                <div className="flex flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-2">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category}
                            className="shrink-0"
                            initial={{ opacity: 1, y: 0 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.02, duration: 0.28 }}
                        >
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
                                        onError={(event) =>
                                            handleCategoryImageError(event, category, { width: 160, height: 160 })
                                        }
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                </div>
                                <p className="mt-1.5 line-clamp-2 max-w-[74px] text-[10px] font-semibold leading-tight text-gray-700">
                                    {category}
                                </p>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-8 md:py-10">
                <div className="rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8 border border-primary/20 shadow-lg relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-primary/20 text-primary-dark text-xs font-bold uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                                Your Feed
                            </div>
                            <h2 className="text-2xl font-black text-dark sm:text-3xl">Followed Shops Updates</h2>
                        </div>
                        {!localStorage.getItem('authToken') && (
                            <Link to="/auth" className="text-sm font-semibold text-primary hover:underline bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-sm">
                                Login to see followed feed
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
                                Followed products available nahi hain. Shops follow karo to yahan products dikhenge.
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
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4 md:py-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">Recently Viewed</h2>
                    </div>
                    {!localStorage.getItem('authToken') && (
                        <Link to="/auth" className="text-sm font-semibold text-primary hover:underline">
                            Login to build your viewed list
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
                            Aapke recently viewed products abhi empty hain.
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
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4 md:py-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">
                            Top Rated Shops Near You
                        </h2>
                        <p className="text-sm text-gray-500">
                            {selectedLocation.city && activeAreas.length
                                ? `Sorted by rating in ${areaSummary}, ${selectedLocation.city}`
                                : 'Sorted by best ratings across all shops'}
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
                        Nearby top-rated shops abhi available nahi hain.
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
            </motion.section>

            {!loadingRandomServices && randomServices.length > 0 && (
                <motion.section {...sectionMotion} className="container mx-auto px-4 py-2 md:py-4">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black text-dark sm:text-2xl">
                                Services Near You
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
                                    src={service.images?.[0] || 'https://via.placeholder.com/700x420?text=Service+Image'}
                                    alt={service.name}
                                    loading="lazy"
                                    decoding="async"
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
                </motion.section>
            )}

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">
                            Newly Added Products
                        </h2>
                        <p className="text-sm text-gray-500">
                            Fresh listings from nearby shops.
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
                        Newly added products abhi available nahi hain.
                    </p>
                )}

                {!loadingLatestProducts && latestProducts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {latestProducts.map((product) => (
                            <ProductCard key={product._id} product={product} desktopTall />
                        ))}
                    </div>
                )}
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-dark sm:text-2xl">
                            Available in your nearby shops
                        </h2>
                        <p className="text-sm text-gray-500">
                            {selectedLocation.city && activeAreas.length
                                ? `Showing for ${areaSummary}, ${selectedLocation.city}`
                                : 'Showing products from all available shops'}
                        </p>
                    </div>
                    <Chip
                        size="small"
                        icon={<WindowRoundedIcon style={{ fontSize: 14 }} />}
                        label={selectedLocation.city && activeAreas.length ? `${activeAreas.length}-area feed` : 'All-city feed'}
                        sx={{
                            borderRadius: '999px',
                            fontWeight: 700,
                            color: 'var(--color-dark)',
                            bgcolor: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(100,116,139,0.25)',
                        }}
                    />
                </div>

                {loadingRandom && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {[...Array(8)].map((_, index) => (
                            <Skeleton key={index} type="product" />
                        ))}
                    </div>
                )}

                {!loadingRandom && randomProducts.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                        Random products available nahi hain.
                    </p>
                )}

                {!loadingRandom && randomProducts.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {randomProducts.map((product) => (
                            <ProductCard key={product._id} product={product} desktopTall />
                        ))}
                    </div>
                )}
            </motion.section>
        </div>
    );
};

export default HomePage;
