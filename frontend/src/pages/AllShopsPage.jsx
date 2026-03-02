import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import StoreMallDirectoryRoundedIcon from '@mui/icons-material/StoreMallDirectoryRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { motion } from 'framer-motion';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { filterCategoriesWithLocalImages } from '../utils/categoryImage';
import { buildAreaQueryParam, formatAreaSummary, getAreaFilterState } from '../utils/areaFilters';

const PAGE_SIZE = 20;

const AllShopsPage = () => {
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
            return 'All locations';
        }

        return `${areaSummary}, ${areaFilterState.city}`;
    }, [areaFilterState.areas.length, areaFilterState.city, areaSummary]);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [categories, setCategories] = useState([]);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchShopsPage = async (targetPage = 1, { reset = false } = {}) => {
        try {
            if (reset) {
                setLoading(true);
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
            const nextShops = Array.isArray(data.shops) ? data.shops : [];
            const totalPages = Number(data.pages || 1);

            setShops((previous) => (reset ? nextShops : previous.concat(nextShops)));
            setCurrentPage(targetPage);
            setHasMore(targetPage < totalPages);
        } catch (error) {
            if (reset) {
                setShops([]);
            }
            showError(extractErrorMessage(error, 'Unable to load listed shops'));
        } finally {
            if (reset) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/shops/categories');
            setCategories(filterCategoriesWithLocalImages(data.categories || []));
        } catch (error) {
            setCategories([]);
        }
    };

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
                    <p className="mb-2 text-sm text-gray-500">Browse all listed shops</p>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">All Listed Shops</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip
                        size="small"
                        icon={<StoreMallDirectoryRoundedIcon style={{ fontSize: 15 }} />}
                        label={
                            selectedCategory === 'all'
                                ? locationBadgeLabel
                                : `${selectedCategory} | ${locationBadgeLabel}`
                        }
                        sx={{
                            borderRadius: '999px',
                            fontWeight: 700,
                            border: '1px solid rgba(148,163,184,0.3)',
                            bgcolor: 'rgba(255,255,255,0.86)',
                        }}
                    />
                </div>
            </div>

            <form
                onSubmit={applyLocation}
                className="mb-4 grid gap-2 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm md:grid-cols-4"
            >
                <FormControl size="small">
                    <InputLabel id="shop-category-filter-label">Category</InputLabel>
                    <Select
                        labelId="shop-category-filter-label"
                        value={selectedCategory}
                        label="Category"
                        onChange={(event) => setSelectedCategory(event.target.value)}
                    >
                        <MenuItem value="all">All</MenuItem>
                        {categories.map((category) => (
                            <MenuItem value={category} key={category}>
                                {category}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Search shop name"
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <FormControl size="small">
                    <InputLabel id="shop-sort-filter-label">Sort</InputLabel>
                    <Select
                        labelId="shop-sort-filter-label"
                        value={sortBy}
                        label="Sort"
                        onChange={(event) => setSortBy(event.target.value)}
                    >
                        <MenuItem value="latest">Latest</MenuItem>
                        <MenuItem value="oldest">Oldest</MenuItem>
                        <MenuItem value="rating_desc">Top rated</MenuItem>
                        <MenuItem value="name_asc">Name A-Z</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    type="submit"
                    variant="contained"
                    startIcon={<TuneRoundedIcon />}
                    sx={{
                        borderRadius: '8px',
                        px: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        minHeight: 34,
                        backgroundColor: 'var(--color-dark)',
                    }}
                >
                    Apply
                </Button>
            </form>
            <p className="mb-4 text-[11px] text-gray-500">
                Area filter Home page ke Area Feed Selection se sync hota hai.
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
                        ? 'Is location ke liye abhi koi shop listed nahi hai.'
                        : `Is location me "${selectedCategory}" category ki koi shop listed nahi hai.`}
                </p>
            )}

            {!loading && shops.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {shops.map((shop, index) => (
                            <motion.div
                                key={shop._id}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.015, duration: 0.24 }}
                            >
                                <Link
                                    to={`/shop/${shop._id}`}
                                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <img
                                        src={
                                            shop.images?.[0] ||
                                            'https://via.placeholder.com/500x300?text=Shop+Image'
                                        }
                                        alt={shop.name}
                                        loading="lazy"
                                        decoding="async"
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
                            </motion.div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-6 flex justify-center">
                            <Button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                variant="outlined"
                                sx={{
                                    borderRadius: '999px',
                                    px: 3,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                }}
                            >
                                {loadingMore ? 'Loading...' : 'Load more shops'}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AllShopsPage;
