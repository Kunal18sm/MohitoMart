import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import SuggestionInput from '../components/SuggestionInput';
import api from '../services/api';
import { useLocationSuggestions } from '../utils/locationSuggestions';

const PAGE_SIZE = 20;

const CategoryPage = () => {
    const { id } = useParams();

    const savedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );

    const [city, setCity] = useState(savedLocation.city || '');
    const [area, setArea] = useState(savedLocation.area || '');
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const areaOptions = useMemo(
        () => getAreaOptionsByCity(city),
        [city, getAreaOptionsByCity]
    );

    const categoryName = decodeURIComponent(id || '');

    const fetchCategoryProducts = async (targetPage = 1, { reset = false } = {}) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError('');
            const { data } = await api.get('/products', {
                params: {
                    category: categoryName,
                    keyword: keyword.trim() || undefined,
                    sort: sortBy,
                    city: city || undefined,
                    area: area || undefined,
                    page: targetPage,
                    limit: PAGE_SIZE,
                },
            });

            const nextProducts = Array.isArray(data.products) ? data.products : [];
            const totalPages = Number(data.pages || 1);

            setProducts((previous) => (reset ? nextProducts : previous.concat(nextProducts)));
            setCurrentPage(targetPage);
            setHasMore(targetPage < totalPages);
        } catch (err) {
            if (reset) {
                setProducts([]);
            }
            setError(err.response?.data?.message || 'Unable to fetch category products');
        } finally {
            if (reset) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    };

    useEffect(() => {
        fetchCategoryProducts(1, { reset: true });
    }, [categoryName]);

    const updateLocation = (event) => {
        event.preventDefault();
        fetchCategoryProducts(1, { reset: true });
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) {
            return;
        }

        fetchCategoryProducts(currentPage + 1);
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-4">
                <p className="mb-2 text-sm text-gray-500">
                    <Link to="/" className="hover:underline">
                        Home
                    </Link>{' '}
                    / Category
                </p>
                <h1 className="text-3xl font-black text-dark sm:text-4xl">
                    {categoryName.replace(/\b\w/g, (char) => char.toUpperCase())}
                </h1>
                <p className="text-gray-500">
                    {area && city ? `${area}, ${city}` : 'All locations'}
                </p>
            </div>

            <div className="sticky top-[76px] z-30 -mx-4 px-4 py-3 bg-app-bg/80 backdrop-blur-md mb-8">
                <form
                    onSubmit={updateLocation}
                    className="grid w-full gap-2 rounded-xl border border-glass-border glass-panel p-3 shadow-sm sm:max-w-3xl md:grid-cols-5"
                >
                    <SuggestionInput
                        value={city}
                        onChange={setCity}
                        placeholder="City"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        options={cityOptions}
                    />
                    <SuggestionInput
                        value={area}
                        onChange={setArea}
                        placeholder="Area"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        options={areaOptions}
                    />
                    <input
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Search product"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                        <option value="latest">Latest</option>
                        <option value="oldest">Oldest</option>
                        <option value="price_asc">Price low to high</option>
                        <option value="price_desc">Price high to low</option>
                        <option value="views_desc">Most viewed</option>
                    </select>
                    <button
                        type="submit"
                        className="rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary"
                    >
                        Apply location
                    </button>
                </form>
            </div>

            {error && <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

            {loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {[...Array(8)].map((_, index) => (
                        <Skeleton key={index} type="product" />
                    ))}
                </div>
            )}

            {!loading && products.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-500">
                    Is category me selected location ke liye koi product available nahi hai.
                </p>
            )}

            {!loading && products.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                {loadingMore ? 'Loading...' : 'Load more'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CategoryPage;
