import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded';
import MiscellaneousServicesRoundedIcon from '@mui/icons-material/MiscellaneousServicesRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { motion } from 'framer-motion';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { formatServicePrice } from '../utils/servicePrice';
import { useLocationSuggestions } from '../utils/locationSuggestions';

const AllServicesPage = () => {
    const { showError } = useFlash();
    const storedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );

    const [city, setCity] = useState(storedLocation.city || '');
    const [area, setArea] = useState(storedLocation.area || '');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();

    const areaOptions = useMemo(
        () => getAreaOptionsByCity(city),
        [city, getAreaOptionsByCity]
    );

    const fetchAllServices = async () => {
        try {
            setLoading(true);

            const params = {
                city: city.trim() || undefined,
                area: area.trim() || undefined,
                category: selectedCategory !== 'all' ? selectedCategory : undefined,
                page: 1,
                limit: 50,
            };

            const { data: firstPage } = await api.get('/services', { params });
            let allServices = firstPage.services || [];
            const totalPages = Number(firstPage.pages || 1);

            if (totalPages > 1) {
                const requests = [];
                for (let page = 2; page <= totalPages; page += 1) {
                    requests.push(
                        api.get('/services', {
                            params: {
                                ...params,
                                page,
                            },
                        })
                    );
                }

                const responses = await Promise.all(requests);
                responses.forEach(({ data }) => {
                    allServices = allServices.concat(data.services || []);
                });
            }

            setServices(allServices);
        } catch (error) {
            setServices([]);
            showError(extractErrorMessage(error, 'Unable to load services'));
        } finally {
            setLoading(false);
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
        fetchAllServices();
    }, []);

    const applyFilters = (event) => {
        event.preventDefault();
        fetchAllServices();
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
                    <Button
                        component={Link}
                        to="/"
                        variant="outlined"
                        startIcon={<KeyboardBackspaceRoundedIcon />}
                        sx={{
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontWeight: 700,
                        }}
                    >
                        Back to Home
                    </Button>
                </div>
            </div>

            <form
                onSubmit={applyFilters}
                className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:grid-cols-2 lg:grid-cols-4"
            >
                <TextField
                    size="small"
                    label="City"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    inputProps={{
                        list: 'all-services-city-suggestions',
                    }}
                />
                <TextField
                    size="small"
                    label="Area"
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                    inputProps={{
                        list: 'all-services-area-suggestions',
                    }}
                />
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
                <div className="md:col-span-2 lg:col-span-1">
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<TuneRoundedIcon />}
                        sx={{
                            borderRadius: '10px',
                            px: 2.8,
                            textTransform: 'none',
                            fontWeight: 700,
                            minHeight: 40,
                            backgroundColor: 'var(--color-dark)',
                        }}
                    >
                        Apply Filters
                    </Button>
                </div>
            </form>
            <datalist id="all-services-city-suggestions">
                {cityOptions.map((cityOption) => (
                    <option value={cityOption} key={cityOption} />
                ))}
            </datalist>
            <datalist id="all-services-area-suggestions">
                {areaOptions.map((areaOption) => (
                    <option value={areaOption} key={areaOption} />
                ))}
            </datalist>
            <p className="mb-6 text-xs text-gray-500">
                Yahan location change temporary filter hai. Main location update karne ke liye profile use karein.
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
            )}
        </div>
    );
};

export default AllServicesPage;
