import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { formatServicePrice } from '../utils/servicePrice';

const ShopDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [activeImage, setActiveImage] = useState('');
    const [shopData, setShopData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [updatingPriceHideAccess, setUpdatingPriceHideAccess] = useState(false);

    const fetchShopDetails = async () => {
        try {
            setLoading(true);
            setError('');
            const shopRequest = api.get(`/shops/${id}`);
            const profileRequest = localStorage.getItem('authToken')
                ? api.get('/users/profile').catch(() => null)
                : Promise.resolve(null);

            const [shopResponse, profileResponse] = await Promise.all([shopRequest, profileRequest]);
            const data = shopResponse.data;

            setIsAdmin(profileResponse?.data?.role === 'admin');
            setShopData(data);
            setActiveImage(data.shop.images?.[0] || '');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load shop details');
            setShopData(null);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShopDetails();
    }, [id]);

    const handleFollowToggle = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setFollowLoading(true);
            if (shopData.shop.isFollowed) {
                await api.delete(`/users/follows/${id}`);
            } else {
                await api.post(`/users/follows/${id}`);
            }
            setShopData((previous) => {
                if (!previous?.shop) {
                    return previous;
                }

                return {
                    ...previous,
                    shop: {
                        ...previous.shop,
                        isFollowed: !previous.shop.isFollowed,
                    },
                };
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update follow state');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleRatingSubmit = async (event) => {
        event.preventDefault();
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        if (!String(comment || '').trim()) {
            setError('Please share a short comment with your rating.');
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/shops/${id}/rate`, {
                rating,
                comment: comment.trim(),
            });
            setComment('');
            await fetchShopDetails();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to submit rating');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePriceHideAccessToggle = async () => {
        const shopId = shopData?.shop?._id;
        if (!shopId || !isAdmin) {
            return;
        }

        const nextAccessState = !Boolean(shopData.shop.allowPriceHide);

        try {
            setUpdatingPriceHideAccess(true);
            await api.put(`/shops/${shopId}`, { allowPriceHide: nextAccessState });
            setShopData((previous) => {
                if (!previous?.shop) {
                    return previous;
                }

                return {
                    ...previous,
                    shop: {
                        ...previous.shop,
                        allowPriceHide: nextAccessState,
                    },
                    products: nextAccessState
                        ? previous.products
                        : (previous.products || []).map((product) => ({
                            ...product,
                            hideOriginalPrice: false,
                        })),
                };
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update hidden price access');
        } finally {
            setUpdatingPriceHideAccess(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <Skeleton />
            </div>
        );
    }

    if (!shopData) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error || 'Shop not found'}</p>
            </div>
        );
    }

    const { shop, products = [], services = [], ratings = [] } = shopData;

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <p className="mb-4 text-sm text-gray-500">
                <Link to="/" className="hover:underline">
                    Home
                </Link>{' '}
                / Shop
            </p>

            {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

            <section className="mb-12 grid gap-8 lg:grid-cols-2">
                <div>
                    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                        <img
                            src={activeImage || 'https://via.placeholder.com/900x550?text=Shop+Image'}
                            alt={shop.name}
                            className="h-[280px] w-full object-cover sm:h-[340px] md:h-[420px]"
                        />
                    </div>
                    <div className="flex gap-3 overflow-x-auto">
                        {(shop.images || []).map((image) => (
                            <button
                                key={image}
                                type="button"
                                onClick={() => setActiveImage(image)}
                                className={`overflow-hidden rounded-lg border ${activeImage === image ? 'border-primary' : 'border-gray-200'
                                    }`}
                            >
                                <img src={image} alt="shop" className="h-20 w-24 object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-light px-3 py-1 text-xs font-semibold text-gray-600">
                            {shop.category}
                        </span>
                        <span className="text-sm text-gray-500">
                            {Number(shop.rating || 0).toFixed(1)} stars ({shop.numRatings || 0} ratings)
                        </span>
                    </div>

                    <h1 className="mb-4 text-3xl font-black text-dark sm:text-4xl">{shop.name}</h1>
                    <p className="mb-4 text-gray-600">{shop.description || 'No description available.'}</p>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-light p-3 text-sm text-gray-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
                            <p className="mt-1 font-semibold text-dark">
                                {shop.location?.area}, {shop.location?.city}
                            </p>
                        </div>
                        <div className="rounded-xl bg-light p-3 text-sm text-gray-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</p>
                            <p className="mt-1 font-semibold text-dark">{shop.location?.address || 'Not provided'}</p>
                        </div>
                        <div className="rounded-xl bg-light p-3 text-sm text-gray-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mobile</p>
                            <p className="mt-1 font-semibold text-dark">{shop.mobile || 'Not provided'}</p>
                        </div>
                        <div className="rounded-xl bg-light p-3 text-sm text-gray-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Timings</p>
                            <p className="mt-1 font-semibold text-dark">
                                {shop.openTime || '09:00'} - {shop.closeTime || '21:00'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-light p-3 text-sm text-gray-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</p>
                            <p className="mt-1 font-semibold text-dark">{shop.owner?.name || 'Not available'}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {shop.whatsappNumber && (
                            <a
                                href={`https://wa.me/${shop.whatsappNumber}?text=${encodeURIComponent(`Hi, I found your shop ${shop.name} on Mohito Mart.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-600 shadow-lg shadow-green-500/30"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                Chat on WhatsApp
                            </a>
                        )}
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors ${shop.isFollowed ? 'bg-green-600 hover:bg-green-700' : 'bg-dark hover:bg-primary'
                                } disabled:opacity-60`}
                        >
                            {followLoading
                                ? 'Updating...'
                                : shop.isFollowed
                                    ? 'Following (click to unfollow)'
                                    : 'Follow Shop'}
                        </button>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={handlePriceHideAccessToggle}
                                disabled={updatingPriceHideAccess}
                                className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors ${shop.allowPriceHide
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-slate-700 hover:bg-slate-800'
                                    } disabled:opacity-60`}
                            >
                                {updatingPriceHideAccess
                                    ? 'Updating...'
                                    : shop.allowPriceHide
                                        ? 'Revoke Price Hide Access'
                                        : 'Give Price Hide Access'}
                            </button>
                        )}
                        {shop.mapUrl && (
                            <a
                                href={shop.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary"
                            >
                                Open on Google Maps
                            </a>
                        )}
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="mb-4 text-3xl font-black text-dark">Shop Products</h2>
                {products.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                        This shop has not added any products yet.
                    </p>
                )}
                {products.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={{ ...product, shop }} />
                        ))}
                    </div>
                )}
            </section>

            <section className="mb-12">
                <h2 className="mb-4 text-3xl font-black text-dark">Shop Services</h2>
                {services.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-500">
                        This shop has not added any services yet.
                    </p>
                )}
                {services.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                        {services.map((service) => (
                            <article
                                key={service._id}
                                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                            >
                                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
                                    {(service.images || []).map((image, index) => (
                                        <img
                                            key={`${service._id}-${image}-${index}`}
                                            src={image}
                                            alt={service.name}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-44 min-w-full snap-start rounded-xl border border-gray-200 object-cover sm:h-52"
                                        />
                                    ))}
                                </div>
                                <div className="mt-3 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-xl font-black text-dark">{service.name}</h3>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                            {service.category}
                                        </p>
                                    </div>
                                    <p className="text-lg font-black text-primary">{formatServicePrice(service)}</p>
                                </div>
                                <p className="mt-2 text-sm text-gray-600">
                                    {service.description || 'Service details not added yet.'}
                                </p>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                    <h2 className="mb-4 text-2xl font-black text-dark">Rate This Shop</h2>
                    <form onSubmit={handleRatingSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Rating (1-5)</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={rating}
                                onChange={(event) => setRating(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                                Experience (required)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(event) => setComment(event.target.value)}
                                rows="4"
                                required
                                placeholder="Share your experience in at least a few words."
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : 'Submit Rating'}
                        </button>
                    </form>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
                    <h2 className="mb-4 text-2xl font-black text-dark">Recent Ratings</h2>
                    {ratings.length === 0 && (
                        <p className="text-sm text-gray-500">No ratings yet. Be the first to rate.</p>
                    )}
                    {ratings.length > 0 && (
                        <div className="space-y-4">
                            {ratings.map((entry) => (
                                <div key={entry._id} className="rounded-xl bg-light p-4">
                                    <div className="mb-1 flex items-center justify-between">
                                        <p className="font-semibold text-dark">{entry.user?.name || 'User'}</p>
                                        <p className="text-sm text-gray-500">{entry.rating}/5</p>
                                    </div>
                                    <p className="text-sm text-gray-600">{entry.comment || 'No comment shared.'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default ShopDetailsPage;
