import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';
import { filterCategoriesWithLocalImages } from '../utils/categoryImage';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import { detectDeviceLocation } from '../utils/deviceLocation';
import SuggestionInput from '../components/SuggestionInput';

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
    const [detectingLocation, setDetectingLocation] = useState(false);
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
    const shopApprovalStatus = String(existingShop?.approvalStatus || '').toLowerCase();
    const isShopApproved = shopApprovalStatus === 'approved';
    const canOpenManagement = Boolean(existingShop);

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

    const autofillLocationFromDevice = async () => {
        if (detectingLocation) {
            return;
        }

        try {
            setDetectingLocation(true);
            const detected = await detectDeviceLocation({ timeoutMs: 9000 });
            setForm((previous) => ({
                ...previous,
                city: detected.city,
                area: detected.area,
            }));
            if (detected.isApproximate) {
                showSuccess(
                    `Approximate location: ${detected.area}, ${detected.city}. Please verify area.`
                );
            } else {
                showSuccess(`Location detected: ${detected.area}, ${detected.city}`);
            }
        } catch (error) {
            const rawMessage = String(error?.message || '');
            const permissionDenied =
                error?.code === 1 ||
                /permission\s*denied/i.test(rawMessage) ||
                /not\s*allowed/i.test(rawMessage);
            const message = permissionDenied
                ? 'Location permission is blocked. Please allow it in your browser settings and try again.'
                : extractErrorMessage(error, 'Unable to detect your location');
            showError(message);
        } finally {
            setDetectingLocation(false);
        }
    };

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

            if (!payload.name || !payload.category || !payload.city || !payload.area) {
                showError('Name, category, city and area are required');
                return;
            }

            let imageUrls = existingShop?.images || [];
            if (selectedFiles.length > 0) {
                setUploading(true);
                imageUrls = await uploadImages(selectedFiles, 'mohito-mart/shops');
                setUploading(false);
            }

            if (imageUrls.length < 1 || imageUrls.length > 5) {
                showError('Please upload 1 to 5 shop images');
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
                const { data } = await api.post('/shops', {
                    ...payload,
                    images: imageUrls,
                });
                const createdShopStatus = String(data?.approvalStatus || 'pending').toLowerCase();
                showSuccess(
                    createdShopStatus === 'approved'
                        ? 'Shop profile created'
                        : 'Shop profile submitted. Waiting for admin approval'
                );
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
        <div className="container mx-auto max-w-6xl px-4 py-5 md:py-6">
            <section className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <Link
                            to={canOpenManagement ? '/owner/products' : '#'}
                            onClick={(event) => {
                                if (!canOpenManagement) {
                                    event.preventDefault();
                                    showError(
                                        existingShop
                                            ? 'Unable to open products right now'
                                            : 'Create shop profile first'
                                    );
                                }
                            }}
                            className={`rounded-lg px-3 py-2 text-center text-xs font-semibold transition-colors ${canOpenManagement
                                ? 'bg-dark text-white hover:bg-primary'
                                : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500'
                                }`}
                        >
                            Manage Products
                        </Link>
                        <Link
                            to={canOpenManagement ? '/owner/services' : '#'}
                            onClick={(event) => {
                                if (!canOpenManagement) {
                                    event.preventDefault();
                                    showError(
                                        existingShop
                                            ? 'Unable to open services right now'
                                            : 'Create shop profile first'
                                    );
                                }
                            }}
                            className={`rounded-lg px-3 py-2 text-center text-xs font-semibold transition-colors ${canOpenManagement
                                ? 'bg-dark text-white hover:bg-primary'
                                : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500'
                                }`}
                        >
                            Manage Services
                        </Link>
                    </div>
                </div>

            </section>

            {existingShop && !isShopApproved && (
                <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800">
                        Shop status: {shopApprovalStatus || 'pending'} | Admin approval pending.
                        You can save up to 10 products and 3 services for now, and they stay hidden until approval.
                    </p>
                </section>
            )}

            {existingShop && (
                <section className="mt-3 space-y-3">
                    <article className="rounded-2xl border border-gray-200 bg-white p-2">
                        {existingShop.images?.length ? (
                            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
                                {existingShop.images.map((imageUrl, index) => (
                                    <AdaptiveCardImage
                                        key={`${imageUrl}-${index}`}
                                        source={imageUrl}
                                        alt={`${existingShop.name}-${index + 1}`}
                                        kind="shop"
                                        containerClassName="h-36 min-w-[220px] snap-start rounded-xl border border-gray-200 bg-white sm:h-44 sm:min-w-[260px]"
                                        fillContainer
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-36 items-center justify-center rounded-xl bg-gray-50 text-xs font-semibold text-gray-500 sm:h-44">
                                No cover image
                            </div>
                        )}
                        <div className="space-y-1 px-2 py-2 sm:px-3">
                            <p className="line-clamp-1 text-sm font-bold text-dark">{existingShop.name}</p>
                            <p className="line-clamp-2 text-xs text-gray-500">
                                {existingShop.description || 'Shop description add karein for better discovery.'}
                            </p>
                        </div>
                    </article>

                    <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
                        <Link
                            to="/owner/products"
                            className="rounded-xl border border-gray-200 bg-white p-2.5 text-center transition hover:border-primary"
                        >
                            <p className="mx-auto inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                <ProductBoxIcon /> Products
                            </p>
                            <p className="mt-1.5 text-base font-black text-dark">{shopStats.totalProducts}</p>
                        </Link>

                        <Link
                            to="/owner/services"
                            className="rounded-xl border border-gray-200 bg-white p-2.5 text-center transition hover:border-primary"
                        >
                            <p className="mx-auto inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                                <SparklesIcon /> Services
                            </p>
                            <p className="mt-1.5 text-base font-black text-dark">{shopStats.totalServices}</p>
                        </Link>

                        <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                            <p className="mx-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                <EyeIcon /> Views
                            </p>
                            <p className="mt-1.5 text-base font-black text-dark">{shopStats.totalViews}</p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
                            <p className="mx-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                <StarIcon /> Rating
                            </p>
                            <p className="mt-1.5 text-base font-black text-dark">
                                {shopStats.rating}{' '}
                                <span className="text-[11px] font-semibold text-gray-500">
                                    ({shopStats.ratingsCount})
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="mx-auto flex w-full max-w-3xl justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                            <UsersIcon />
                            Total Followers: {shopStats.totalFollowers}
                        </div>
                    </div>
                </section>
            )}

            <section className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-black text-dark">
                        {existingShop ? 'Update Shop Details' : 'Create Shop Details'}
                    </h2>
                </div>

                <form onSubmit={submitShop} className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Shop Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Shop name"
                            value={form.name}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.category}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, category: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                                <option value={category} key={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Shop location
                        </p>
                        <button
                            type="button"
                            onClick={autofillLocationFromDevice}
                            disabled={detectingLocation}
                            className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                        >
                            {detectingLocation ? 'Detecting location...' : 'Use my current location'}
                        </button>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            City <span className="text-red-500">*</span>
                        </label>
                        <SuggestionInput
                            value={form.city}
                            options={cityOptions}
                            onChange={(nextValue) =>
                                setForm((previous) => ({ ...previous, city: nextValue }))
                            }
                            placeholder="City"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Area <span className="text-red-500">*</span>
                        </label>
                        <SuggestionInput
                            value={form.area}
                            options={areaOptions}
                            onChange={(nextValue) =>
                                setForm((previous) => ({ ...previous, area: nextValue }))
                            }
                            placeholder="Area"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Address
                        </label>
                        <input
                            type="text"
                            placeholder="Address"
                            value={form.address}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, address: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Mobile
                        </label>
                        <input
                            type="text"
                            placeholder="Mobile number"
                            value={form.mobile}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, mobile: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Google Map URL
                        </label>
                        <input
                            type="text"
                            placeholder="https://maps.google.com/..."
                            value={form.mapUrl}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, mapUrl: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Description
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Short shop description"
                            value={form.description}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, description: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-dark">
                            Shop Images (1 to 5) <span className="text-red-500">*</span>
                        </label>
                        <label
                            htmlFor="shop-profile-images"
                            className="flex h-20 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 transition-colors hover:border-primary hover:bg-primary/5"
                        >
                            <div className="text-center">
                                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-dark text-sm font-bold text-white">
                                    +
                                </span>
                                <p className="mt-1 text-xs font-semibold text-dark">Add or replace shop photos</p>
                                <p className="text-[11px] text-gray-500">JPG/PNG, max 5 images</p>
                            </div>
                        </label>
                        <input
                            id="shop-profile-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelection}
                            className="hidden"
                        />
                        {uploading && <p className="mt-1 text-xs text-gray-500">Uploading images...</p>}
                    </div>

                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 md:col-span-2 md:grid-cols-5">
                            {previewUrls.map((url, index) => (
                                <AdaptiveCardImage
                                    key={`${url}-${index}`}
                                    source={url}
                                    alt={`preview-${index + 1}`}
                                    kind="shop"
                                    containerClassName="h-16 rounded-lg border border-gray-200 bg-white sm:h-20"
                                    fillContainer
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="rounded-lg bg-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50 md:col-span-2"
                    >
                        {saving ? 'Saving...' : existingShop ? 'Update Shop Profile' : 'Create Shop Profile'}
                    </button>
                </form>
            </section>
        </div>
    );
};

export default ShopProfilePage;
