import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';

const OwnerAddProductPage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileRole, setProfileRole] = useState('user');
    const [shops, setShops] = useState([]);
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
    const primaryShop = useMemo(() => shops?.[0] || null, [shops]);
    const isPrimaryShopPending = String(primaryShop?.approvalStatus || '').toLowerCase() === 'pending';
    const canUseHiddenPrice = Boolean(primaryShop?.allowPriceHide);

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

    const loadInitialData = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const [profileRes, shopsRes] = await Promise.all([
                api.get('/users/profile'),
                api.get('/shops/me/owned'),
            ]);

            setProfileRole(profileRes.data.role);
            const ownedShops = shopsRes.data.shops || [];
            setShops(ownedShops);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to open add product page'));
            navigate('/owner/products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

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

    const addProduct = async (event) => {
        event.preventDefault();

        if (!primaryShop?._id) {
            showError('No shop found for this account');
            return;
        }

        if (form.price === '') {
            showError('Product price is required');
            return;
        }

        if (selectedFiles.length < 1 || selectedFiles.length > 5) {
            showError('Please select 1 to 5 product images');
            return;
        }

        try {
            setUploading(true);
            const uploadedImageUrls = await uploadImages(selectedFiles, 'mohito-mart/products');
            setUploading(false);

            setSaving(true);
            await api.post('/products', {
                shopId: primaryShop._id,
                name: form.name.trim() || undefined,
                price: Number(form.price),
                hideOriginalPrice: canUseHiddenPrice ? Boolean(form.hideOriginalPrice) : false,
                description: form.description.trim(),
                images: uploadedImageUrls,
            });

            showSuccess('Product added successfully');
            navigate('/owner/products');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to add product'));
        } finally {
            setUploading(false);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading add product page...</p>
            </div>
        );
    }

    if (!canManageItems) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Only shop owners can add product listings.
                </p>
            </div>
        );
    }

    if (shops.length === 0) {
        return (
            <div className="container mx-auto px-4 py-10">
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
                    <p className="text-gray-600">Create your shop profile first, then you can add items.</p>
                    <Link
                        to="/owner/shop"
                        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                        Create Shop Profile
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-6 md:py-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black text-dark sm:text-3xl">Add New Product</h1>
                <Link
                    to="/owner/products"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Back to Products
                </Link>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                {isPrimaryShopPending && (
                    <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                        Shop approval pending: you can save up to 10 products now. They will stay hidden until admin approval.
                    </p>
                )}
                <form onSubmit={addProduct} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark">
                            Product Name
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                            placeholder="e.g. Wireless Headphones"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark">
                            Price (Rs) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.price}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, price: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                            placeholder="e.g. 999"
                        />
                    </div>

                    {canUseHiddenPrice && (
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark">
                                Price Visibility
                            </label>
                            <label className="inline-flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <span className="text-xs font-semibold text-gray-700">
                                    Hide original price from customers and competitors
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
                                show prices in range like: &lt;500.
                            </p>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark">
                            Description
                        </label>
                        <textarea
                            rows="3"
                            value={form.description}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, description: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                            placeholder="Product details"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-dark">
                            Product Images (1 to 5) <span className="text-red-500">*</span>
                        </label>
                        <label
                            htmlFor="owner-product-images"
                            className="flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 transition-colors hover:border-primary hover:bg-primary/5"
                        >
                            <div className="flex flex-col items-center gap-1 text-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-dark text-lg font-bold text-white">
                                    +
                                </span>
                                <p className="text-xs font-semibold text-dark">Tap to add photos</p>
                                <p className="text-[11px] text-gray-500">PNG/JPG, max 5 images</p>
                            </div>
                        </label>
                        <input
                            id="owner-product-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelection}
                            className="hidden"
                        />
                        {(uploading || saving) && (
                            <p className="mt-2 text-xs text-gray-500">
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
                                    containerClassName="h-20 rounded-lg border border-gray-200 bg-white"
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
                        Save Product
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OwnerAddProductPage;
