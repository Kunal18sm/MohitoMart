import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { formatServicePrice } from '../utils/servicePrice';
import { buildAreaQueryParam, formatAreaSummary, getAreaFilterState } from '../utils/areaFilters';

const PAGE_SIZE = 20;
const mergeUniqueServices = (existingServices = [], incomingServices = []) => {
    const mergedServices = [...existingServices];
    const seenServiceIds = new Set(
        existingServices.map((entry) => String(entry?._id || '')).filter(Boolean)
    );

    incomingServices.forEach((entry) => {
        const serviceId = String(entry?._id || '');
        if (!serviceId || seenServiceIds.has(serviceId)) {
            return;
        }

        seenServiceIds.add(serviceId);
        mergedServices.push(entry);
    });

    return mergedServices;
};

const AllServicesPage = () => {
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

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [categories, setCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const requestIdRef = useRef(0);

    const fetchServicesPage = useCallback(
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

                const { data } = await api.get('/services', { params });
                if (requestId !== requestIdRef.current) {
                    return;
                }

                const nextServices = Array.isArray(data.services) ? data.services : [];
                const totalPages = Number(data.pages || 1);

                setServices((previous) =>
                    reset ? nextServices : mergeUniqueServices(previous, nextServices)
                );
                setCurrentPage(targetPage);
                setHasMore(targetPage < totalPages);
            } catch (error) {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                if (reset) {
                    setServices([]);
                }
                showError(extractErrorMessage(error, t('unable_load_services') || 'Unable to load services'));
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

    const fetchServiceCategories = useCallback(async () => {
        try {
            const { data } = await api.get('/services/categories');
            setCategories(Array.isArray(data.categories) ? data.categories : []);
        } catch (error) {
            setCategories([]);
        }
    }, []);

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
                    <p className="mb-2 text-sm text-gray-500">{t('browse_all_listed_services') || 'Browse all listed services'}</p>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">{t('all_services') || 'All Services'}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/90 px-2.5 py-1 text-xs font-bold text-dark">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3h2v4h-2zM4.9 6.3 6.3 4.9l2.8 2.8-1.4 1.4ZM3 11h4v2H3zm14 1a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm2-1h2v2h-2zm-4 8h2v2h-2zM6.3 19.1 4.9 17.7l2.8-2.8 1.4 1.4Z" />
                        </svg>
                        {`${services.length} ${t('services_count_label') || 'services'}`}
                    </span>
                </div>
            </div>

            <form
                onSubmit={applyFilters}
                className="mb-4 grid gap-2 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm md:grid-cols-4"
            >
                <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
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
                    placeholder={t('search_service_name') || 'Search service name'}
                    className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
                <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="rounded-md border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-primary"
                >
                    <option value="latest">{t('latest') || 'Latest'}</option>
                    <option value="oldest">{t('oldest') || 'Oldest'}</option>
                    <option value="price_asc">{t('price_low_to_high') || 'Price low to high'}</option>
                    <option value="price_desc">{t('price_high_to_low') || 'Price high to low'}</option>
                </select>
                <button
                    type="submit"
                    className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md bg-dark px-4 text-sm font-bold text-white transition hover:bg-primary-dark"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4 21 6-6m0 0 2.4 2.4M10 15V3m10 0v18m0 0-2.4-2.4M20 21l-6-6" />
                    </svg>
                    {t('apply_filters') || 'Apply Filters'}
                </button>
            </form>
            <p className="mb-4 text-[11px] text-gray-500">
                {areaFilterState.city && areaFilterState.areas.length
                    ? `${t('area_filter_sync_with_values_prefix') || 'Area filter is synced from the Home page:'} ${areaSummary}, ${areaFilterState.city}.`
                    : t('area_filter_sync_home') || 'Area filter is synced with the Home page area feed selection.'}
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
                    {t('no_services_for_filter') || 'No service is available for this filter.'}
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
                                        {service.description || (t('service_details_not_added') || 'Service details not added yet.')}
                                    </p>

                                    <div className="rounded-xl bg-light p-3 text-sm text-gray-600">
                                        <p className="line-clamp-1 font-semibold text-dark">
                                            {service.shop?.name || (t('shop') || 'Shop')}
                                        </p>
                                        <p className="line-clamp-1 text-xs">
                                            {service.shop?.location?.area && service.shop?.location?.city
                                                ? `${service.shop.location.area}, ${service.shop.location.city}`
                                                : t('location_not_available') || 'Location not available'}
                                        </p>
                                    </div>

                                    <Link
                                        to={`/shop/${service.shop?._id || ''}`}
                                        aria-disabled={!service.shop?._id}
                                        className={`inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-sm font-bold transition ${
                                            service.shop?._id
                                                ? 'border-slate-300 text-dark hover:border-slate-400'
                                                : 'pointer-events-none border-slate-200 text-slate-400'
                                        }`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18l-1.2 9.2A2 2 0 0 1 17.8 21H6.2a2 2 0 0 1-2-1.8L3 10Zm2-6h14l2 6H3l2-6Z" />
                                        </svg>
                                        {t('open_shop') || 'Open Shop'}
                                    </Link>
                                </div>
                            </motion.article>
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
                                {loadingMore ? (t('loading') || 'Loading...') : (t('load_more_services') || 'Load more services')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AllServicesPage;
