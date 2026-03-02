import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { formatServicePrice } from '../utils/servicePrice';

const ServiceDetailsPage = () => {
    const { id } = useParams();
    const [service, setService] = useState(null);
    const [mainImage, setMainImage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchService = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.get(`/services/${id}`);
            setService(data);
            setMainImage(data.images?.[0] || '');
        } catch (err) {
            setService(null);
            setError(err.response?.data?.message || 'Unable to fetch service details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchService();
    }, [id]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <Skeleton />
            </div>
        );
    }

    if (!service) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error || 'Service not found'}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <p className="mb-4 text-sm text-gray-500">
                <Link to="/" className="hover:underline">
                    Home
                </Link>{' '}
                / Service
            </p>

            <div className="grid gap-8 lg:grid-cols-2">
                <div>
                    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                        <img
                            src={mainImage || 'https://via.placeholder.com/900x500?text=Service+Image'}
                            alt={service.name}
                            loading="eager"
                            decoding="async"
                            className="h-[280px] w-full object-cover sm:h-[360px] md:h-[420px]"
                        />
                    </div>
                    {(service.images || []).length > 1 && (
                        <div className="flex gap-3 overflow-x-auto">
                            {(service.images || []).map((image) => (
                                <button
                                    key={image}
                                    type="button"
                                    onClick={() => setMainImage(image)}
                                    className={`overflow-hidden rounded-lg border ${mainImage === image ? 'border-primary' : 'border-gray-200'
                                        }`}
                                >
                                    <img
                                        src={image}
                                        alt="thumbnail"
                                        loading="lazy"
                                        decoding="async"
                                        className="h-20 w-24 object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-6">
                    <span className="rounded-full bg-light px-3 py-1 text-xs font-semibold text-gray-600">
                        {service.category}
                    </span>
                    <h1 className="mb-3 mt-4 text-3xl font-black text-dark sm:text-4xl">{service.name}</h1>
                    <p className="mb-5 text-2xl font-black text-primary sm:text-3xl">
                        {formatServicePrice(service)}
                    </p>
                    <p className="mb-6 text-gray-600">
                        {service.description || 'No description available.'}
                    </p>

                    <div className="space-y-2 text-sm text-gray-600">
                        <p>
                            <span className="font-semibold text-dark">Shop:</span>{' '}
                            {service.shop?._id ? (
                                <Link to={`/shop/${service.shop._id}`} className="text-primary hover:underline">
                                    {service.shop?.name || 'Shop'}
                                </Link>
                            ) : (
                                service.shop?.name || 'Shop'
                            )}
                        </p>
                        <p>
                            <span className="font-semibold text-dark">Shop rating:</span>{' '}
                            {Number(service.shop?.rating || 0).toFixed(1)} / 5 ({service.shop?.numRatings || 0}{' '}
                            ratings)
                        </p>
                        <p>
                            <span className="font-semibold text-dark">Location:</span>{' '}
                            {service.shop?.location?.area && service.shop?.location?.city
                                ? `${service.shop.location.area}, ${service.shop.location.city}`
                                : 'Location not available'}
                        </p>
                    </div>

                    {service.shop?._id && (
                        <div className="mt-8 flex flex-wrap gap-4">
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-primary/30"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Book Service Now
                            </button>
                            <Link
                                to={`/shop/${service.shop._id}`}
                                className="inline-flex items-center justify-center rounded-xl bg-dark px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-gray-800 hover:shadow-gray-800/30"
                            >
                                View Shop Profile
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceDetailsPage;
