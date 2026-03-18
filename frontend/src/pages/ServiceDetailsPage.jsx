import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { formatServicePrice } from '../utils/servicePrice';
import { getPlaceholderImage } from '../utils/imageFallbacks';

const ServiceDetailsPage = () => {
    const { id } = useParams();
    const [service, setService] = useState(null);
    const [mainImage, setMainImage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [shopGalleryIndex, setShopGalleryIndex] = useState(0);

    const fetchService = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.get(`/services/${id}`);
            setService(data);
            setMainImage(data.images?.[0] || '');
            setShopGalleryIndex(0);
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

    const shopImages =
        service?.shop?.images?.length > 0
            ? service.shop.images
            : [getPlaceholderImage('shop')];
    const hasMultipleShopImages = shopImages.length > 1;
    const showPreviousShopImage = () => {
        setShopGalleryIndex((previous) => Math.max(previous - 1, 0));
    };

    const showNextShopImage = () => {
        setShopGalleryIndex((previous) => Math.min(previous + 1, shopImages.length - 1));
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="grid gap-8 lg:grid-cols-2">
                <div>
                    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                        <AdaptiveCardImage
                            source={mainImage}
                            alt={service.name}
                            kind="service"
                            responsiveOptions={{
                                width: 1200,
                                widths: [480, 768, 960, 1200],
                                sizes: '(max-width: 1024px) 100vw, 50vw',
                                quality: 'auto:best',
                            }}
                            containerClassName="h-[280px] bg-white sm:h-[360px] md:h-[420px]"
                            fillContainer
                        />
                    </div>
                    {(service.images || []).length > 1 && (
                        <div className="flex gap-3 overflow-x-auto">
                            {(service.images || []).map((image, index) => (
                                <button
                                    key={image}
                                    type="button"
                                    onClick={() => setMainImage(image)}
                                    aria-label={`Show service image ${index + 1}`}
                                    className={`overflow-hidden rounded-lg border ${mainImage === image ? 'border-primary' : 'border-gray-200'
                                        }`}
                                >
                                    <AdaptiveCardImage
                                        source={image}
                                        alt={`service-${index + 1}`}
                                        kind="service"
                                        responsiveOptions={{
                                            width: 240,
                                            widths: [96, 160, 240],
                                            sizes: '96px',
                                            quality: 'auto:eco',
                                        }}
                                        containerClassName="h-20 w-24 bg-white"
                                        fillContainer
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

            {service.shop && (
                <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-5">
                    <div className="mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                            This service is offered by
                        </p>
                        <h2 className="mt-1 text-xl font-black text-dark sm:text-2xl">
                            {service.shop?.name || 'Shop'}
                        </h2>
                    </div>

                    <div className="relative">
                        <div className="overflow-hidden rounded-2xl border border-gray-200">
                            <div
                                className="flex transition-transform duration-500 ease-out"
                                style={{ transform: `translateX(-${shopGalleryIndex * 100}%)` }}
                            >
                                {shopImages.map((image, index) => (
                                    <div key={`${image}-${index}`} className="min-w-full">
                                        {service.shop?._id ? (
                                            <Link to={`/shop/${service.shop._id}`} className="block">
                                                <AdaptiveCardImage
                                                    source={image}
                                                    alt={service.shop.name}
                                                    kind="shop"
                                                    responsiveOptions={{
                                                        width: 1280,
                                                        widths: [480, 768, 960, 1280],
                                                        sizes: '(max-width: 1024px) 100vw, 50vw',
                                                    }}
                                                    containerClassName="h-52 bg-white sm:h-60 md:h-64"
                                                    fillContainer
                                                />
                                            </Link>
                                        ) : (
                                            <AdaptiveCardImage
                                                source={image}
                                                alt={service.shop.name}
                                                kind="shop"
                                                responsiveOptions={{
                                                    width: 1280,
                                                    widths: [480, 768, 960, 1280],
                                                    sizes: '(max-width: 1024px) 100vw, 50vw',
                                                }}
                                                containerClassName="h-52 bg-white sm:h-60 md:h-64"
                                                fillContainer
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {hasMultipleShopImages && (
                            <>
                                <button
                                    type="button"
                                    onClick={showPreviousShopImage}
                                    disabled={shopGalleryIndex === 0}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-black text-dark shadow disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Show previous shop image"
                                >
                                    {'<'}
                                </button>
                                <button
                                    type="button"
                                    onClick={showNextShopImage}
                                    disabled={shopGalleryIndex >= shopImages.length - 1}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-black text-dark shadow disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Show next shop image"
                                >
                                    {'>'}
                                </button>
                            </>
                        )}
                    </div>

                    {shopImages.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {shopImages.map((image, index) => (
                                <button
                                    key={`${image}-thumb-${index}`}
                                    type="button"
                                    onClick={() => setShopGalleryIndex(index)}
                                    aria-label={`Show shop gallery image ${index + 1}`}
                                    className={`overflow-hidden rounded-lg border ${
                                        shopGalleryIndex === index ? 'border-primary' : 'border-gray-200'
                                    }`}
                                >
                                    <AdaptiveCardImage
                                        source={image}
                                        alt={`${service.shop.name}-preview-${index + 1}`}
                                        kind="shop"
                                        responsiveOptions={{
                                            width: 240,
                                            widths: [96, 160, 240],
                                            sizes: '96px',
                                            quality: 'auto:eco',
                                        }}
                                        containerClassName="h-14 w-20 bg-white sm:h-16 sm:w-24"
                                        fillContainer
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default ServiceDetailsPage;
