import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';
import { filterCategoriesWithLocalImages } from '../utils/categoryImage';
import { useLocationSuggestions } from '../utils/locationSuggestions';

const ProductBoxIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
        <path d="M3 12l9 4.5 9-4.5M12 21V7.5" />
    </svg>
);

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const StarIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 2.5 3 6.08 6.7.98-4.85 4.72 1.15 6.67L12 17.8l-6 3.15 1.15-6.67L2.3 9.56l6.7-.98L12 2.5Z" />
    </svg>
);

const UsersIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const SparklesIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 2 1.7 4.3L18 8l-4.3 1.7L12 14l-1.7-4.3L6 8l4.3-1.7L12 2Z" />
        <path d="m5 15 1 2.5L8.5 19 6 20l-1 2.5L4 20l-2.5-1L4 17.5 5 15Z" />
        <path d="m19 13 .8 2 .2.1 2 .8-2 .8-.2.1-.8 2-.8-2-.2-.1-2-.8 2-.8.2-.1.8-2Z" />
    </svg>
);

const ShopProfilePage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [ownerRole, setOwnerRole] = useState('user');
    const [existingShop, setExistingShop] = useState(null);
    const [shopSummary, setShopSummary] = useState({
        totalProducts: 0,
        totalViews: 0,
        totalServices: 0,
    });
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    const [form, setForm] = useState({
        name: '',
        category: '',
        city: '',
        area: '',
        address: '',
        mapUrl: '',
        mobile: '',
        description: '',
    });

    const canManageShop = useMemo(
        () => ['shop_owner', 'admin'].includes(ownerRole),
        [ownerRole]
    );

    const shopStats = useMemo(() => {
        return {
            totalProducts: Number(shopSummary.totalProducts || 0),
            totalViews: Number(shopSummary.totalViews || 0),
            totalServices: Number(shopSummary.totalServices || 0),
            rating: Number(existingShop?.rating || 0).toFixed(1),
            ratingsCount: existingShop?.numRatings || 0,
            totalFollowers: Number(existingShop?.totalFollowers || 0),
        };
    }, [shopSummary, existingShop]);
    const areaOptions = useMemo(
        () => getAreaOptionsByCity(form.city),
        [form.city, getAreaOptionsByCity]
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

    const loadData = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const [profileRes, categoriesRes, ownedShopsRes] = await Promise.all([
                api.get('/users/profile'),
                api.get('/shops/categories'),
                api.get('/shops/me/owned'),
            ]);

            setOwnerRole(profileRes.data.role);
            const filteredCategories = filterCategoriesWithLocalImages(
                categoriesRes.data.categories || []
            );
            setCategories(filteredCategories);

            const ownedShop = ownedShopsRes.data.shops?.[0] || null;
            setExistingShop(ownedShop);

            if (ownedShop) {
                setForm({
                    name: ownedShop.name || '',
                    category: ownedShop.category || '',
                    city: ownedShop.location?.city || '',
                    area: ownedShop.location?.area || '',
                    address: ownedShop.location?.address || '',
                    mapUrl: ownedShop.mapUrl || '',
                    mobile: ownedShop.mobile || '',
                    description: ownedShop.description || '',
                });
                setPreviewUrls(ownedShop.images || []);

                try {
                    const [productsRes, servicesRes] = await Promise.all([
                        api.get('/products/me/list', {
                            params: {
                                shopId: ownedShop._id,
                                statsOnly: true,
                            },
                        }),
                        api.get('/services/me/list', {
                            params: {
                                shopId: ownedShop._id,
                                statsOnly: true,
                            },
                        }),
                    ]);
                    setShopSummary({
                        totalProducts: productsRes.data.summary?.totalProducts || 0,
                        totalViews: productsRes.data.summary?.totalViews || 0,
                        totalServices: servicesRes.data.summary?.totalServices || 0,
                    });
                } catch (error) {
                    setShopSummary({
                        totalProducts: 0,
                        totalViews: 0,
                        totalServices: 0,
                    });
                }
            } else {
                setForm((previous) => ({
                    ...previous,
                    category: filteredCategories?.[0] || '',
                    city: profileRes.data.location?.city || '',
                    area: profileRes.data.location?.area || '',
                }));
                setPreviewUrls([]);
                setShopSummary({
                    totalProducts: 0,
                    totalViews: 0,
                    totalServices: 0,
                });
            }
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load shop profile page'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleFileSelection = (event) => {
        try {
            const files = validateImageFiles(event.target.files, { min: 3, max: 5, maxSizeMB: 5 });

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

    const submitShop = async (event) => {
        event.preventDefault();
        if (!canManageShop) {
            showError('Only shop owners can manage shop profile');
            return;
        }

        try {
            const payload = {
                name: form.name.trim(),
                category: form.category,
                city: form.city.trim(),
                area: form.area.trim(),
                address: form.address.trim(),
                mapUrl: form.mapUrl.trim(),
                mobile: form.mobile.trim(),
                description: form.description.trim(),
            };

            if (!payload.name || !payload.category || !payload.city || !payload.area || !payload.mapUrl) {
                showError('Name, category, city, area and map URL are required');
                return;
            }

            let imageUrls = existingShop?.images || [];
            if (selectedFiles.length > 0) {
                setUploading(true);
                imageUrls = await uploadImages(selectedFiles, 'mohito-mart/shops');
                setUploading(false);
            }

            if (imageUrls.length < 3 || imageUrls.length > 5) {
                showError('Please upload 3 to 5 shop images');
                return;
            }

            setSaving(true);
            if (existingShop) {
                await api.put(`/shops/${existingShop._id}`, {
                    ...payload,
                    images: imageUrls,
                });
                showSuccess('Shop profile updated');
            } else {
                await api.post('/shops', {
                    ...payload,
                    images: imageUrls,
                });
                showSuccess('Shop profile created');
            }

            setSelectedFiles([]);
            await loadData();
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to save shop profile'));
        } finally {
            setUploading(false);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading shop profile...</p>
            </div>
        );
    }

    if (!canManageShop) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Only shop owners can access this page.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">Shop Dashboard</h1>
                    <p className="text-sm text-gray-500">
                        Profile, products aur services ko ek jagah se manage karein.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2 sm:gap-3">
                        <Link
                            to="/owner/products"
                            className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white hover:bg-primary-dark"
                        >
                            Manage Products
                        </Link>
                        <Link
                            to="/owner/services"
                            className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white hover:bg-primary-dark"
                        >
                            Manage Services
                        </Link>
                    </div>
                    <Link
                        to="/profile"
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        My Profile
                    </Link>
                </div>
            </div>

            {existingShop && (
                <section className="mb-6 space-y-5">
                    {existingShop.images?.[0] && (
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                            <img
                                src={existingShop.images[0]}
                                alt={existingShop.name}
                                loading="lazy"
                                decoding="async"
                                className="h-40 w-full object-cover sm:h-52"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                        <Link
                            to="/owner/products"
                            className="min-w-0 rounded-xl border border-gray-100 bg-white p-2.5 transition hover:border-primary hover:shadow-sm sm:rounded-2xl sm:p-3"
                        >
                            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">
                                <ProductBoxIcon /> Products
                            </p>
                            <p className="mt-1 text-base font-black text-dark sm:mt-1.5 sm:text-xl">
                                {shopStats.totalProducts}
                            </p>
                        </Link>
                        <Link
                            to="/owner/services"
                            className="min-w-0 rounded-xl border border-gray-100 bg-white p-2.5 transition hover:border-primary hover:shadow-sm sm:rounded-2xl sm:p-3"
                        >
                            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">
                                <SparklesIcon /> Services
                            </p>
                            <p className="mt-1 text-base font-black text-dark sm:mt-1.5 sm:text-xl">
                                {shopStats.totalServices}
                            </p>
                        </Link>
                        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2.5 sm:rounded-2xl sm:p-3">
                            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">
                                <EyeIcon /> Views
                            </p>
                            <p className="mt-1 text-base font-black text-dark sm:mt-1.5 sm:text-xl">
                                {shopStats.totalViews}
                            </p>
                        </div>
                        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-2.5 sm:rounded-2xl sm:p-3">
                            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[11px]">
                                <StarIcon /> Rating
                            </p>
                            <p className="mt-1 text-base font-black text-dark sm:mt-1.5 sm:text-xl">
                                {shopStats.rating}{' '}
                                <span className="text-[10px] font-semibold text-gray-500 sm:text-sm">
                                    ({shopStats.ratingsCount})
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                        <UsersIcon />
                        Total Followers: {shopStats.totalFollowers}
                    </div>
                </section>
            )}

            <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <h2 className="mb-4 text-2xl font-black text-dark">
                    {existingShop ? 'Update Shop Details' : 'Create Shop Details'}
                </h2>
                <form onSubmit={submitShop} className="grid gap-4 md:grid-cols-2">
                    <input
                        type="text"
                        placeholder="Shop name"
                        value={form.name}
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, name: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                    />
                    <select
                        value={form.category}
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, category: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                    >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                            <option value={category} key={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="City"
                        value={form.city}
                        list="shop-profile-city-suggestions"
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, city: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                    />
                    <input
                        type="text"
                        placeholder="Area"
                        value={form.area}
                        list="shop-profile-area-suggestions"
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, area: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                    />
                    <input
                        type="text"
                        placeholder="Address (optional)"
                        value={form.address}
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, address: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                    />
                    <input
                        type="text"
                        placeholder="Mobile (optional)"
                        value={form.mobile}
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, mobile: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                    />
                    <input
                        type="text"
                        placeholder="Google Maps URL"
                        value={form.mapUrl}
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, mapUrl: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary md:col-span-2"
                    />
                    <textarea
                        rows="3"
                        placeholder="Shop description (optional)"
                        value={form.description}
                        onChange={(event) =>
                            setForm((previous) => ({ ...previous, description: event.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary md:col-span-2"
                    />

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Select Shop Images (3 to 5)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelection}
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
                        />
                        {uploading && <p className="mt-2 text-sm text-gray-500">Uploading images...</p>}
                    </div>

                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 md:col-span-2 md:grid-cols-5">
                            {previewUrls.map((url, index) => (
                                <img
                                    key={`${url}-${index}`}
                                    src={url}
                                    alt={`preview-${index + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-20 w-full rounded-lg border border-gray-200 object-cover md:h-24"
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50 md:col-span-2"
                    >
                        {saving ? 'Saving...' : existingShop ? 'Update Shop Profile' : 'Create Shop Profile'}
                    </button>
                    <datalist id="shop-profile-city-suggestions">
                        {cityOptions.map((cityOption) => (
                            <option value={cityOption} key={cityOption} />
                        ))}
                    </datalist>
                    <datalist id="shop-profile-area-suggestions">
                        {areaOptions.map((areaOption) => (
                            <option value={areaOption} key={areaOption} />
                        ))}
                    </datalist>
                </form>
            </div>
        </div>
    );
};

export default ShopProfilePage;
