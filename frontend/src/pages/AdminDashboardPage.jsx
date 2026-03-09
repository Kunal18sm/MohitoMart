import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { useFlash } from '../context/FlashContext';
import { extractErrorMessage } from '../utils/errorUtils';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import { formatProductPrice } from '../utils/productPrice';
import { writeCachedHomeBannerImages } from '../utils/homeBannerCache';
import SuggestionInput from '../components/SuggestionInput';

const AdminDashboardPage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();

    const [loading, setLoading] = useState(true);
    const [savingBanner, setSavingBanner] = useState(false);
    const [profile, setProfile] = useState(null);
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        city: '',
        area: '',
        password: '',
    });
    const [shops, setShops] = useState([]);
    const [products, setProducts] = useState([]);
    const [totalShops, setTotalShops] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const [bannerImages, setBannerImages] = useState([]);
    const [selectedBannerFiles, setSelectedBannerFiles] = useState([]);
    const [bannerPreviewUrls, setBannerPreviewUrls] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletingProductId, setDeletingProductId] = useState('');
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();

    useEffect(
        () => () => {
            bannerPreviewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        },
        [bannerPreviewUrls]
    );

    const visibleProducts = useMemo(() => {
        const keyword = productSearch.trim().toLowerCase();
        if (!keyword) {
            return products;
        }

        return products.filter((product) => {
            const name = String(product.name || '').toLowerCase();
            const category = String(product.category || '').toLowerCase();
            const shopName = String(product.shop?.name || '').toLowerCase();
            return name.includes(keyword) || category.includes(keyword) || shopName.includes(keyword);
        });
    }, [products, productSearch]);
    const areaOptions = useMemo(
        () => getAreaOptionsByCity(profileForm.city),
        [getAreaOptionsByCity, profileForm.city]
    );

    const loadAdminDashboard = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const { data: profileData } = await api.get('/users/profile');

            if (profileData.role !== 'admin') {
                showError('Only admin can open admin dashboard');
                navigate('/profile', { replace: true });
                return;
            }

            setProfile(profileData);
            setProfileForm({
                name: profileData.name || '',
                email: profileData.email || '',
                city: profileData.location?.city || '',
                area: profileData.location?.area || '',
                password: '',
            });

            const [shopsRes, productsRes, bannerRes] = await Promise.all([
                api.get('/shops', { params: { page: 1, limit: 5 } }),
                api.get('/products', { params: { page: 1, limit: 10 } }),
                api.get('/banners/home').catch(() => ({ data: { images: [] } })),
            ]);

            setShops(Array.isArray(shopsRes.data.shops) ? shopsRes.data.shops : []);
            setProducts(Array.isArray(productsRes.data.products) ? productsRes.data.products : []);
            setTotalShops(Number(shopsRes.data.total || 0));
            setTotalProducts(Number(productsRes.data.total || 0));
            const loadedBannerImages = Array.isArray(bannerRes.data.images) ? bannerRes.data.images : [];
            setBannerImages(loadedBannerImages);
            writeCachedHomeBannerImages(loadedBannerImages);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load admin dashboard'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAdminDashboard();
    }, []);

    const handleBannerSelection = (event) => {
        try {
            const files = validateImageFiles(event.target.files, { min: 3, max: 3, maxSizeMB: 6 });

            bannerPreviewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });

            setSelectedBannerFiles(files);
            setBannerPreviewUrls(files.map((file) => URL.createObjectURL(file)));
        } catch (error) {
            showError(extractErrorMessage(error));
            event.target.value = '';
        }
    };

    const saveHomeBanners = async () => {
        if (selectedBannerFiles.length !== 3) {
            showError('Please select exactly 3 banner images');
            return;
        }

        try {
            setSavingBanner(true);
            const uploadedUrls = await uploadImages(selectedBannerFiles, 'mohito-mart/home-banners');
            await api.put('/banners/home', { images: uploadedUrls });
            const { data } = await api.get('/banners/home');
            const savedImages = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
            setBannerImages(savedImages);
            writeCachedHomeBannerImages(savedImages);
            setSelectedBannerFiles([]);
            bannerPreviewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
            setBannerPreviewUrls([]);
            showSuccess('Home banners updated');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to update home banners'));
        } finally {
            setSavingBanner(false);
        }
    };

    const deleteProduct = async () => {
        if (!deleteTarget?._id) {
            return;
        }

        try {
            setDeletingProductId(deleteTarget._id);
            await api.delete(`/products/${deleteTarget._id}`);
            setProducts((previous) => previous.filter((product) => product._id !== deleteTarget._id));
            setTotalProducts((previous) => Math.max(0, previous - 1));
            setDeleteTarget(null);
            showSuccess('Product deleted');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to delete product'));
        } finally {
            setDeletingProductId('');
        }
    };

    const updateAdminProfile = async (event) => {
        event.preventDefault();

        try {
            const payload = {
                name: profileForm.name.trim(),
                city: profileForm.city.trim(),
                area: profileForm.area.trim(),
                password: profileForm.password,
            };

            if (!payload.name || !payload.city || !payload.area) {
                showError('Name, city and area are required');
                return;
            }

            if (payload.password && payload.password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }

            setSavingProfile(true);
            const { data } = await api.put('/users/profile', payload);

            setProfile((previous) => ({
                ...previous,
                ...data,
            }));
            setProfileForm((previous) => ({
                ...previous,
                name: data.name || previous.name,
                email: data.email || previous.email,
                city: data.location?.city || previous.city,
                area: data.location?.area || previous.area,
                password: '',
            }));

            localStorage.setItem(
                'userProfile',
                JSON.stringify({
                    id: data._id,
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    location: data.location,
                })
            );
            localStorage.setItem(
                'selectedLocation',
                JSON.stringify({
                    city: data.location?.city,
                    area: data.location?.area,
                })
            );
            window.dispatchEvent(new Event('storage'));
            showSuccess('Admin profile updated');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to update admin profile'));
        } finally {
            setSavingProfile(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // continue with local logout
        }

        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
        window.dispatchEvent(new Event('storage'));
        navigate('/auth');
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading admin dashboard...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">Admin Panel</h1>
                    <p className="text-sm text-gray-500">
                        Welcome {profile?.name || 'Admin'} | Manage shops, products and home banners.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowProfileEditor((previous) => !previous)}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        {showProfileEditor ? 'Close Profile Edit' : 'Edit Profile'}
                    </button>
                    <button
                        type="button"
                        onClick={loadAdminDashboard}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Refresh Data
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {showProfileEditor && (
                <section className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                    <h2 className="mb-4 text-2xl font-black text-dark">Edit Admin Profile</h2>
                    <form onSubmit={updateAdminProfile} className="grid gap-4 md:grid-cols-2">
                        <input
                            type="text"
                            placeholder="Name"
                            value={profileForm.name}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={profileForm.email}
                            readOnly
                            disabled
                            className="cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 outline-none"
                        />
                        <SuggestionInput
                            placeholder="City"
                            value={profileForm.city}
                            options={cityOptions}
                            onChange={(nextValue) =>
                                setProfileForm((previous) => ({ ...previous, city: nextValue }))
                            }
                            className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <SuggestionInput
                            placeholder="Area"
                            value={profileForm.area}
                            options={areaOptions}
                            onChange={(nextValue) =>
                                setProfileForm((previous) => ({ ...previous, area: nextValue }))
                            }
                            className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            placeholder="New password (optional)"
                            value={profileForm.password}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, password: event.target.value }))
                            }
                            className="rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary md:col-span-2"
                        />
                        <button
                            type="submit"
                            disabled={savingProfile}
                            className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-60 md:col-span-2"
                        >
                            {savingProfile ? 'Saving...' : 'Save Admin Profile'}
                        </button>
                    </form>
                </section>
            )}

            <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Total Shops</p>
                    <p className="mt-2 text-3xl font-black text-dark">{totalShops}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Total Products</p>
                    <p className="mt-2 text-3xl font-black text-dark">{totalProducts}</p>
                </article>
                <article className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Banner Slots</p>
                    <p className="mt-2 text-3xl font-black text-dark">{bannerImages.length}/3</p>
                </article>
            </section>

            <section className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-black text-dark">Home Banner Manager</h2>
                    <span className="rounded-full bg-light px-3 py-1 text-xs font-semibold text-gray-600">
                        Exactly 3 images
                    </span>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(bannerPreviewUrls.length ? bannerPreviewUrls : bannerImages).map((image, index) => (
                        <img
                            key={`${image}-${index}`}
                            src={image}
                            alt={`home-banner-${index + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-32 w-full rounded-xl border border-gray-200 object-cover sm:h-40"
                        />
                    ))}
                    {!bannerPreviewUrls.length && bannerImages.length === 0 && (
                        <div className="col-span-full flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-500 sm:h-40">
                            Nothing to show
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBannerSelection}
                        className="max-w-md rounded-lg border border-gray-200 px-4 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={saveHomeBanners}
                        disabled={savingBanner}
                        className="rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50"
                    >
                        {savingBanner ? 'Saving...' : 'Save Home Banners'}
                    </button>
                </div>
            </section>

            <section className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <h2 className="mb-4 text-2xl font-black text-dark">Recent Shops (Last 5)</h2>
                {shops.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-4 text-gray-500">
                        No shops found.
                    </p>
                )}
                {shops.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {shops.map((shop) => (
                            <Link
                                key={shop._id}
                                to={`/shop/${shop._id}`}
                                className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
                            >
                                <AdaptiveCardImage
                                    source={shop.images?.[0]}
                                    alt={shop.name}
                                    kind="shop"
                                    responsiveOptions={{
                                        width: 320,
                                        widths: [120, 180, 240, 320],
                                        sizes:
                                            '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
                                    }}
                                />
                                <div className="p-2.5">
                                    <p className="line-clamp-1 text-sm font-bold text-dark">{shop.name}</p>
                                    <p className="line-clamp-1 text-xs text-gray-500">{shop.category}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-black text-dark">Recent Products (Last 10)</h2>
                    <input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Search in latest 10 products"
                        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary md:w-[320px]"
                    />
                </div>

                {visibleProducts.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-300 p-4 text-gray-500">
                        No products found for current filter.
                    </p>
                )}

                {visibleProducts.length > 0 && (
                    <div className="space-y-3">
                        {visibleProducts.map((product) => (
                            <div
                                key={product._id}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 shrink-0 overflow-hidden rounded-lg bg-light">
                                        <AdaptiveCardImage
                                            source={product.images?.[0]}
                                            alt={product.name}
                                            kind="product"
                                            responsiveOptions={{
                                                width: 96,
                                                widths: [48, 72, 96],
                                                sizes: '48px',
                                            }}
                                        />
                                    </div>
                                    <div>
                                            <p className="font-semibold text-dark">{product.name}</p>
                                            <p className="text-xs text-gray-500">
                                                Shop: {product.shop?.name || '-'} | {product.category}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatProductPrice(product)} | {product.viewsCount || 0} views
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/admin/products/${product._id}/edit`}
                                            className="rounded-lg border border-primary/30 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(product)}
                                            disabled={deletingProductId === product._id}
                                            className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                                        >
                                            {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {deleteTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-black text-dark">Delete Product?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Do you really want to delete{' '}
                            <span className="font-semibold text-dark">{deleteTarget.name}</span>? This action cannot be
                            undone.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={Boolean(deletingProductId)}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={deleteProduct}
                                disabled={Boolean(deletingProductId)}
                                className="rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deletingProductId ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;
