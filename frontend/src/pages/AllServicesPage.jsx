import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import MiscellaneousServicesRoundedIcon from '@mui/icons-material/MiscellaneousServicesRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { motion } from 'framer-motion';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { formatServicePrice } from '../utils/servicePrice';
import { buildAreaQueryParam, formatAreaSummary, getAreaFilterState } from '../utils/areaFilters';

const PAGE_SIZE = 20;

const AllServicesPage = () => {
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

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [categories, setCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchServicesPage = async (targetPage = 1, { reset = false } = {}) => {
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

            const { data } = await api.get('/services', { params });
            const nextServices = Array.isArray(data.services) ? data.services : [];
            const totalPages = Number(data.pages || 1);

            setServices((previous) => (reset ? nextServices : previous.concat(nextServices)));
            setCurrentPage(targetPage);
            setHasMore(targetPage < totalPages);
        } catch (error) {
            if (reset) {
                setServices([]);
            }
            showError(extractErrorMessage(error, 'Unable to load services'));
        } finally {
            if (reset) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    };

    const fetchServiceCategories = async () => {
        try {
            const { data } = await api.get('/services/categories');
            setCategories(Array.isArray(data.categories) ? data.categories : []);
        } catch (error) {
            setCategories([]);
        }
    };

    useEffect(() => {
        fetchServiceCategories();
        fetchServicesPage(1, { reset: true });
    }, []);

    const applyFilters = (event) => {
        event.preventDefault();
        fetchServicesPage(1, { reset: true });
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) {
            return;
        }

        fetchServicesPage(currentPage + 1);
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="mb-2 text-sm text-gray-500">Browse all listed services</p>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">All Services</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip
                        size="small"
                        icon={<MiscellaneousServicesRoundedIcon style={{ fontSize: 15 }} />}
                        label={`${services.length} services`}
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
                onSubmit={applyFilters}
                className="mb-4 grid gap-2 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm md:grid-cols-4"
            >
                <FormControl size="small">
                    <InputLabel id="service-category-filter-label">Category</InputLabel>
                    <Select
                        labelId="service-category-filter-label"
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
                    placeholder="Search service name"
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <FormControl size="small">
                    <InputLabel id="service-sort-filter-label">Sort</InputLabel>
                    <Select
                        labelId="service-sort-filter-label"
                        value={sortBy}
                        label="Sort"
                        onChange={(event) => setSortBy(event.target.value)}
                    >
                        <MenuItem value="latest">Latest</MenuItem>
                        <MenuItem value="oldest">Oldest</MenuItem>
                        <MenuItem value="price_asc">Price low to high</MenuItem>
                        <MenuItem value="price_desc">Price high to low</MenuItem>
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
                    Apply Filters
                </Button>
            </form>
            <p className="mb-4 text-[11px] text-gray-500">
                {areaFilterState.city && areaFilterState.areas.length
                    ? `Area filter Home page se sync hai: ${areaSummary}, ${areaFilterState.city}.`
                    : 'Area filter Home page ke Area Feed Selection se sync hota hai.'}
            </p>

            {loading && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[...Array(9)].map((_, index) => (
                        <div
                            key={index}
                            className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white/80"
                        />
                    ))}
                </div>
            )}

            {!loading && services.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                    Is filter ke liye koi service available nahi hai.
                </p>
            )}

            {!loading && services.length > 0 && (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {services.map((service, index) => (
                            <motion.article
                                key={service._id}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.015, duration: 0.24 }}
                                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                            >
                                <img
                                    src={
                                        service.images?.[0] ||
                                        'https://via.placeholder.com/700x420?text=Service+Image'
                                    }
                                    alt={service.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-44 w-full object-cover"
                                />
                                <div className="space-y-2.5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="line-clamp-1 text-lg font-black text-dark">{service.name}</h2>
                                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                            {service.category}
                                        </span>
                                    </div>

                                    <p className="text-base font-black text-primary">{formatServicePrice(service)}</p>

                                    <p className="line-clamp-2 text-sm text-gray-600">
                                        {service.description || 'Service details not added yet.'}
                                    </p>

                                    <div className="rounded-xl bg-light p-3 text-sm text-gray-600">
                                        <p className="line-clamp-1 font-semibold text-dark">
                                            {service.shop?.name || 'Shop'}
                                        </p>
                                        <p className="line-clamp-1 text-xs">
                                            {service.shop?.location?.area && service.shop?.location?.city
                                                ? `${service.shop.location.area}, ${service.shop.location.city}`
                                                : 'Location not available'}
                                        </p>
                                    </div>

                                    <Button
                                        component={Link}
                                        to={`/shop/${service.shop?._id || ''}`}
                                        disabled={!service.shop?._id}
                                        variant="outlined"
                                        startIcon={<StorefrontRoundedIcon />}
                                        sx={{
                                            borderRadius: '10px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Open Shop
                                    </Button>
                                </div>
                            </motion.article>
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
                                {loadingMore ? 'Loading...' : 'Load more services'}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AllServicesPage;
