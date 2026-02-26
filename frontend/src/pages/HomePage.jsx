import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip } from '@mui/material';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import WindowRoundedIcon from '@mui/icons-material/WindowRounded';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import {
    filterCategoriesWithLocalImages,
    getCategoryLocalImage,
    handleCategoryImageError,
} from '../utils/categoryImage';

const sectionMotion = {
    initial: { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.45, ease: 'easeOut' },
};

const HomePage = () => {
    const { showError } = useFlash();
    const selectedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );

    const [activeSlide, setActiveSlide] = useState(0);
    const [bannerImages, setBannerImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [followedProducts, setFollowedProducts] = useState([]);
    const [randomProducts, setRandomProducts] = useState([]);
    const [loadingFollowed, setLoadingFollowed] = useState(false);
    const [loadingRandom, setLoadingRandom] = useState(false);

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

    const fetchFollowedRandomProducts = async () => {
        if (!localStorage.getItem('authToken')) {
            setFollowedProducts([]);
            return;
        }

        try {
            setLoadingFollowed(true);
            const { data } = await api.get('/users/feed/followed/random', {
                params: {
                    limit: 25,
                },
            });
            setFollowedProducts(data.products || []);
        } catch (error) {
            setFollowedProducts([]);
        } finally {
            setLoadingFollowed(false);
        }
    };

    const fetchRandomProducts = async () => {
        try {
            setLoadingRandom(true);
            const { data } = await api.get('/products/random', {
                params: {
                    limit: 16,
                    city: selectedLocation.city || undefined,
                    area: selectedLocation.area || undefined,
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

    useEffect(() => {
        fetchHomeBanners();
        fetchCategories();
        fetchFollowedRandomProducts();
        fetchRandomProducts();
    }, []);

    return (
        <div className="pb-12">
            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4 md:py-8">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.1)] backdrop-blur">
                    {bannerImages.length > 0 ? (
                        <>
                            <div
                                className="flex transition-transform duration-700 ease-out"
                                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                            >
                                {bannerImages.map((image, index) => (
                                    <div key={`${image}-${index}`} className="relative min-w-full">
                                        <img
                                            src={image}
                                            alt={`banner-${index + 1}`}
                                            loading={index === 0 ? 'eager' : 'lazy'}
                                            decoding="async"
                                            className="h-[185px] w-full object-cover sm:h-[280px] md:h-[430px]"
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
                                        className={`h-2.5 w-7 rounded-full transition ${
                                            index === activeSlide ? 'bg-white' : 'bg-white/40'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex h-[185px] items-center justify-center text-sm font-semibold text-gray-500 sm:h-[280px] md:h-[430px]">
                            Nothing to show
                        </div>
                    )}
                </div>
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-black text-dark sm:text-3xl">Browse Categories</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            component={Link}
                            to="/categories"
                            size="small"
                            startIcon={<TravelExploreRoundedIcon />}
                            sx={{
                                borderRadius: '999px',
                                px: 1.8,
                                textTransform: 'none',
                                fontWeight: 700,
                                color: 'var(--color-primary)',
                                border: '1px solid rgba(15,118,110,0.24)',
                                backgroundColor: 'rgba(15,118,110,0.08)',
                            }}
                        >
                            Explore all
                        </Button>
                        <Button
                            component={Link}
                            to="/shops/all"
                            size="small"
                            startIcon={<StorefrontRoundedIcon />}
                            sx={{
                                borderRadius: '999px',
                                px: 1.8,
                                textTransform: 'none',
                                fontWeight: 700,
                                color: 'var(--color-dark)',
                                border: '1px solid rgba(15,23,42,0.16)',
                                backgroundColor: 'rgba(255,255,255,0.85)',
                            }}
                        >
                            Show all listed shops
                        </Button>
                    </div>
                </div>
                <div className="flex flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-2">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category}
                            className="shrink-0"
                            initial={{ opacity: 0, y: 12 }}
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
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-dark sm:text-3xl">Followed Shops Random Picks</h2>
                    </div>
                    {!localStorage.getItem('authToken') && (
                        <Link to="/auth" className="text-sm font-semibold text-primary hover:underline">
                            Login to see followed feed
                        </Link>
                    )}
                </div>

                {loadingFollowed && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className="min-w-[46%] sm:min-w-[32%] md:min-w-[22%]">
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
                                className="min-w-[60%] shrink-0 snap-start sm:min-w-[38%] md:min-w-[280px] lg:min-w-[240px]"
                            >
                                <ProductCard product={product} compact />
                            </div>
                        ))}
                    </div>
                )}
            </motion.section>

            <motion.section {...sectionMotion} className="container mx-auto px-4 py-4">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-dark sm:text-3xl">
                            Available in your nearby shops
                        </h2>
                        <p className="text-sm text-gray-500">
                            {selectedLocation.city && selectedLocation.area
                                ? `Showing for ${selectedLocation.area}, ${selectedLocation.city}`
                                : 'Showing products from all available shops'}
                        </p>
                    </div>
                    <Chip
                        size="small"
                        icon={<WindowRoundedIcon style={{ fontSize: 14 }} />}
                        label={selectedLocation.city && selectedLocation.area ? 'Area based feed' : 'All-city feed'}
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
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>
                )}
            </motion.section>
        </div>
    );
};

export default HomePage;
