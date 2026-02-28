import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';

const OwnerAddServicePage = () => {
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
        shopId: '',
        name: '',
        priceMin: '',
        priceMax: '',
        description: '',
    });

    const canManageItems = useMemo(
        () => ['shop_owner', 'admin'].includes(profileRole),
        [profileRole]
    );

    const selectedShop = useMemo(
        () => shops.find((shop) => shop._id === form.shopId) || null,
        [shops, form.shopId]
    );

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
            setForm((previous) => ({
                ...previous,
                shopId: ownedShops?.[0]?._id || '',
            }));
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to open add service page'));
            navigate('/owner/services');
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

    const addService = async (event) => {
        event.preventDefault();

        if (!form.shopId) {
            showError('Please select a shop');
            return;
        }

        if (!form.name.trim() || form.priceMin === '' || form.priceMax === '') {
            showError('Service name and price range are required');
            return;
        }

        const priceMin = Number(form.priceMin);
        const priceMax = Number(form.priceMax);
        if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < 0) {
            showError('Please enter a valid non-negative price range');
            return;
        }

        if (priceMax < priceMin) {
            showError('Max price should be greater than or equal to min price');
            return;
        }

        if (selectedFiles.length < 1 || selectedFiles.length > 5) {
            showError('Please select 1 to 5 service images');
            return;
        }

        try {
            setUploading(true);
            const uploadedImageUrls = await uploadImages(selectedFiles, 'mohito-mart/services');
            setUploading(false);

            setSaving(true);
            await api.post('/services', {
                shopId: form.shopId,
                name: form.name.trim(),
                priceMin,
                priceMax,
                description: form.description.trim(),
                images: uploadedImageUrls,
            });

            showSuccess('Service added successfully');
            navigate('/owner/services');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to add service'));
        } finally {
            setUploading(false);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading add service page...</p>
            </div>
        );
    }

    if (!canManageItems) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Only shop owners can add service listings.
                </p>
            </div>
        );
    }

    if (shops.length === 0) {
        return (
            <div className="container mx-auto px-4 py-10">
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
                    <p className="text-gray-600">Pehle shop profile create karein, phir services add kar payenge.</p>
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
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">Add New Service</h1>
                    <p className="text-sm text-gray-500">
                        Selected category: {selectedShop?.category || '-'}
                    </p>
                </div>
                <Link
                    to="/owner/services"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Back to Services
                </Link>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <form onSubmit={addService} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Shop
                        </label>
                        <select
                            value={form.shopId}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, shopId: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        >
                            {shops.map((shop) => (
                                <option value={shop._id} key={shop._id}>
                                    {shop.name} ({shop.category})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Service Name
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                            placeholder="e.g. Hair Cut, Pant Stitching"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Price Min (Rs)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.priceMin}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, priceMin: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                            placeholder="e.g. 100"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Price Max (Rs)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.priceMax}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, priceMax: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                            placeholder="e.g. 500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Description
                        </label>
                        <textarea
                            rows="3"
                            value={form.description}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, description: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                            placeholder="Service ka detail likhein (optional)"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Service Images (1 to 5)
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
                                {uploading ? 'Uploading images...' : 'Saving service...'}
                            </p>
                        )}
                    </div>

                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-5">
                            {previewUrls.map((url, index) => (
                                <img
                                    key={`${url}-${index}`}
                                    src={url}
                                    alt={`preview-${index + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-24 w-full rounded-lg border border-gray-200 object-cover"
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading || saving}
                        className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50 md:col-span-2"
                    >
                        Save Service
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OwnerAddServicePage;
