import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { formatProductPrice } from '../utils/productPrice';

const ProductDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [product, setProduct] = useState(null);
    const [mainImage, setMainImage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFollowed, setIsFollowed] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [shopGalleryIndex, setShopGalleryIndex] = useState(0);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            setError('');
            const productRequest = api.get(`/products/${id}`);
            const profileRequest = localStorage.getItem('authToken')
                ? api.get('/users/profile').catch(() => null)
                : Promise.resolve(null);
            const [productResponse, profileResponse] = await Promise.all([productRequest, profileRequest]);
            const productData = productResponse.data;

            setProduct(productData);
            setMainImage(productData.images?.[0] || '');
            setShopGalleryIndex(0);
            setIsFollowed(Boolean(productData.shop?.isFollowed));
            setIsAdmin(profileResponse?.data?.role === 'admin');
        } catch (err) {
            setProduct(null);
            setIsAdmin(false);
            setError(err.response?.data?.message || 'Unable to fetch product details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const handleFollowToggle = async () => {
        const shopId = product?.shop?._id;
        if (!shopId) {
            return;
        }

        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setFollowLoading(true);
            if (isFollowed) {
                await api.delete(`/users/follows/${shopId}`);
            } else {
                await api.post(`/users/follows/${shopId}`);
            }
            setIsFollowed((previous) => !previous);
            showSuccess(isFollowed ? 'Shop unfollowed' : 'Shop followed');
        } catch (err) {
            showError(extractErrorMessage(err, 'Unable to update follow state'));
        } finally {
            setFollowLoading(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!product?._id) {
            return;
        }

        try {
            setDeleteLoading(true);
            await api.delete(`/products/${product._id}`);
            showSuccess('Product deleted successfully');
            setShowDeleteConfirm(false);
            navigate('/admin', { replace: true });
        } catch (err) {
            showError(extractErrorMessage(err, 'Unable to delete product'));
        } finally {
            setDeleteLoading(false);
        }
    };

    const shopImages =
        product?.shop?.images?.length > 0
            ? product.shop.images
            : ['https://via.placeholder.com/900x600?text=Shop+Image'];
    const hasMultipleShopImages = shopImages.length > 1;

    const showPreviousShopImage = () => {
        setShopGalleryIndex((previous) => Math.max(previous - 1, 0));
    };

    const showNextShopImage = () => {
        setShopGalleryIndex((previous) => Math.min(previous + 1, shopImages.length - 1));
    };

    useEffect(() => {
        if (shopGalleryIndex >= shopImages.length) {
            setShopGalleryIndex(0);
        }
    }, [shopGalleryIndex, shopImages.length]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <Skeleton />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error || 'Product not found'}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <p className="mb-4 text-sm text-gray-500">
                <Link to="/" className="hover:underline">
                    Home
                </Link>{' '}
                / Product
            </p>

            <div className="grid gap-8 lg:grid-cols-2">
                <div>
                    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                        <img
                            src={mainImage || 'https://via.placeholder.com/900x500?text=Product+Image'}
                            alt={product.name}
                            loading="eager"
                            decoding="async"
                            className="h-[240px] w-full object-cover sm:h-[300px] md:h-[360px]"
                        />
                    </div>
                    <div className="flex gap-3 overflow-x-auto">
                        {(product.images || []).map((image) => (
                            <button
                                key={image}
                                type="button"
                                onClick={() => setMainImage(image)}
                                className={`overflow-hidden rounded-lg border ${
                                    mainImage === image ? 'border-primary' : 'border-gray-200'
                                }`}
                            >
                                <img
                                    src={image}
                                    alt="thumbnail"
                                    loading="lazy"
                                    decoding="async"
                                    className="h-16 w-20 object-cover sm:h-20 sm:w-24"
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-5">
                    <span className="rounded-full bg-light px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                        {product.category}
                    </span>
                    <h1 className="mb-2 mt-3 text-2xl font-black text-dark sm:text-3xl">{product.name}</h1>
                    <p className="mb-3 text-xl font-black text-primary sm:text-2xl">
                        {formatProductPrice(product)}
                    </p>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">
                        {product.description || 'No description available.'}
                    </p>

                    <div className="space-y-1.5 text-sm text-gray-600">
                        <p>
                            <span className="font-semibold text-dark">Shop rating:</span>{' '}
                            {Number(product.shop?.rating || 0).toFixed(1)} / 5 ({product.shop?.numRatings || 0}{' '}
                            ratings)
                        </p>
                        <p>
                            <span className="font-semibold text-dark">Location:</span>{' '}
                            {product.shop?.location?.area && product.shop?.location?.city
                                ? `${product.shop.location.area}, ${product.shop.location.city}`
                                : 'Not available'}
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2.5">
                        {product.shop?._id && (
                            <Link
                                to={`/shop/${product.shop._id}`}
                                className="inline-flex rounded-lg bg-dark px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary sm:text-sm"
                            >
                                Open Shop Profile
                            </Link>
                        )}
                        {product.shop?._id && (
                            <button
                                type="button"
                                onClick={handleFollowToggle}
                                disabled={followLoading}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                                    isFollowed
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-primary text-white hover:bg-primary-dark'
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                                {followLoading ? 'Updating...' : isFollowed ? 'Following Shop' : 'Follow Shop'}
                            </button>
                        )}
                        {isAdmin && (
                            <>
                                <Link
                                    to={`/admin/products/${product._id}/edit`}
                                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 sm:text-sm"
                                >
                                    Edit Product
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 sm:text-sm"
                                >
                                    Delete Product
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {product.shop && (
                <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-5">
                    <div className="mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                            This product is offered by
                        </p>
                        <h2 className="mt-1 text-xl font-black text-dark sm:text-2xl">
                            {product.shop?.name || 'Mohito Shop'}
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
                                        {product.shop?._id ? (
                                            <Link to={`/shop/${product.shop._id}`} className="block">
                                                <img
                                                    src={image}
                                                    alt={product.shop.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="h-52 w-full object-cover sm:h-60 md:h-64"
                                                />
                                            </Link>
                                        ) : (
                                            <img
                                                src={image}
                                                alt={product.shop.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-52 w-full object-cover sm:h-60 md:h-64"
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
                                    className={`overflow-hidden rounded-lg border ${
                                        shopGalleryIndex === index ? 'border-primary' : 'border-gray-200'
                                    }`}
                                >
                                    <img
                                        src={image}
                                        alt={`${product.shop.name}-preview-${index + 1}`}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-14 w-20 object-cover sm:h-16 sm:w-24"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-black text-dark">Delete Product?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Do you really want to delete{' '}
                            <span className="font-semibold text-dark">{product.name}</span>? This action cannot be
                            undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleteLoading}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProduct}
                                disabled={deleteLoading}
                                className="rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetailsPage;
