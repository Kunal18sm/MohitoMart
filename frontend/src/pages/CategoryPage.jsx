import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { useLocationSuggestions } from '../utils/locationSuggestions';

const CategoryPage = () => {
    const { id } = useParams();

    const savedLocation = useMemo(
        () => JSON.parse(localStorage.getItem('selectedLocation') || '{}'),
        []
    );

    const [city, setCity] = useState(savedLocation.city || '');
    const [area, setArea] = useState(savedLocation.area || '');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const areaOptions = useMemo(
        () => getAreaOptionsByCity(city),
        [city, getAreaOptionsByCity]
    );

    const categoryName = decodeURIComponent(id || '');

    const fetchCategoryProducts = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.get('/products', {
                params: {
                    category: categoryName,
                    city: city || undefined,
                    area: area || undefined,
                    limit: 24,
                },
            });
            setProducts(data.products || []);
        } catch (err) {
            setProducts([]);
            setError(err.response?.data?.message || 'Unable to fetch category products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategoryProducts();
    }, [categoryName, city, area]);

    const updateLocation = (event) => {
        event.preventDefault();
        fetchCategoryProducts();
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
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

                <form
                    onSubmit={updateLocation}
                    className="grid w-full gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:max-w-xl md:grid-cols-3"
                >
                    <input
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="City"
                        list="category-city-suggestions"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <input
                        value={area}
                        onChange={(event) => setArea(event.target.value)}
                        placeholder="Area"
                        list="category-area-suggestions"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary"
                    >
                        Apply location
                    </button>
                </form>
                <datalist id="category-city-suggestions">
                    {cityOptions.map((cityOption) => (
                        <option value={cityOption} key={cityOption} />
                    ))}
                </datalist>
                <datalist id="category-area-suggestions">
                    {areaOptions.map((areaOption) => (
                        <option value={areaOption} key={areaOption} />
                    ))}
                </datalist>
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {products.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
