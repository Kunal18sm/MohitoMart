import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';

const OwnerEditProductPage = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileRole, setProfileRole] = useState('user');
    const [product, setProduct] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [form, setForm] = useState({
        name: '',
        price: '',
        hideOriginalPrice: false,
        description: '',
    });

    const canManageItems = useMemo(
        () => ['shop_owner', 'admin'].includes(profileRole),
        [profileRole]
    );
    const canUseHiddenPrice = Boolean(product?.shop?.allowPriceHide);

    useEffect(
        () => () => {
            previewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        },
        [previewUrls]
    );

    const loadProduct = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const [profileRes, productRes] = await Promise.all([
                api.get('/users/profile'),
                api.get(`/products/${productId}`),
            ]);

            setProfileRole(profileRes.data.role);

            if (!['shop_owner', 'admin'].includes(profileRes.data.role)) {
                showError('Only shop owners can edit product listings');
                navigate('/profile', { replace: true });
                return;
            }

            const matchedProduct = productRes.data || null;
            if (!matchedProduct?._id) {
                showError('Product not found');
                navigate('/owner/products');
                return;
            }

            setProduct(matchedProduct);
            setForm({
                name: matchedProduct.name || '',
                price: String(matchedProduct.price ?? ''),
                hideOriginalPrice: Boolean(
                    matchedProduct.hideOriginalPrice && matchedProduct.shop?.allowPriceHide
                ),
                description: matchedProduct.description || '',
            });
            setPreviewUrls(matchedProduct.images || []);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load product for edit'));
            navigate('/owner/products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProduct();
    }, [productId]);

    const handleFileSelection = (event) => {
        try {
            const files = validateImageFiles(event.target.files, { min: 1, max: 5, maxSizeMB: 5 });

            previewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });

            setSelectedFiles(files);
            setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
        } catch (error) {
            showError(extractErrorMessage(error));
            event.target.value = '';
        }
    };

    const updateProduct = async (event) => {
        event.preventDefault();

        if (!form.name.trim() || !form.price) {
            showError('Product name and price are required');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name: form.name.trim(),
                price: Number(form.price),
                hideOriginalPrice: canUseHiddenPrice ? Boolean(form.hideOriginalPrice) : false,
                description: form.description.trim(),
            };

            if (selectedFiles.length > 0) {
                setUploading(true);
                const uploadedImageUrls = await uploadImages(selectedFiles, 'mohito-mart/products');
                payload.images = uploadedImageUrls;
                setUploading(false);
            }

            await api.put(`/products/${productId}`, payload);
            showSuccess('Product updated successfully');
            navigate('/owner/products');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to update product'));
        } finally {
            setUploading(false);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading product editor...</p>
            </div>
        );
    }

    if (!canManageItems || !product) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Only shop owners can edit product listings.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">Edit Product</h1>
                    <p className="text-sm text-gray-500">
                        Shop: {product.shop?.name || '-'} | Category: {product.category}
                    </p>
                </div>
                <Link
                    to="/owner/products"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Back to Products
                </Link>
                <Link
                    to="/owner/services"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Manage Services
                </Link>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <form onSubmit={updateProduct} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Product name"
                            value={form.name}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Price (Rs) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Price"
                            value={form.price}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, price: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    {canUseHiddenPrice && (
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Price Visibility
                            </label>
                            <label className="inline-flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <span className="text-sm font-semibold text-gray-700">
                                    Hide original price from customers
                                </span>
                                <input
                                    type="checkbox"
                                    checked={form.hideOriginalPrice}
                                    onChange={(event) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            hideOriginalPrice: event.target.checked,
                                        }))
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                                When enabled, customers will not see the exact price and will only see a range such
                                as &lt;500 or &lt;1000.
                            </p>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Description
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Description"
                            value={form.description}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, description: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Replace Images (1 to 5)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelection}
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
                        />
                        {(uploading || saving) && (
                            <p className="mt-2 text-sm text-gray-500">
                                {uploading ? 'Uploading images...' : 'Saving product...'}
                            </p>
                        )}
                    </div>

                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-5">
                            {previewUrls.map((url, index) => (
                                <AdaptiveCardImage
                                    key={`${url}-${index}`}
                                    source={url}
                                    alt={`preview-${index + 1}`}
                                    kind="product"
                                    containerClassName="h-24 rounded-lg border border-gray-200 bg-white"
                                    fillContainer
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading || saving}
                        className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50 md:col-span-2"
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OwnerEditProductPage;
