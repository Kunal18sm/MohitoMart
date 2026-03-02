import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import FlashBanner from './components/FlashBanner';
import Footer from './components/Footer';
import GlobalSavingOverlay from './components/GlobalSavingOverlay';
import InstallAppPrompt from './components/InstallAppPrompt';
import OnboardingOverlay from './components/OnboardingOverlay';
import BottomNav from './components/BottomNav';
import RouteGuard from './components/RouteGuard';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const ProductDetailsPage = lazy(() => import('./pages/ProductDetailsPage'));
const ServiceDetailsPage = lazy(() => import('./pages/ServiceDetailsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ShopDetailsPage = lazy(() => import('./pages/ShopDetailsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ShopProfilePage = lazy(() => import('./pages/ShopProfilePage'));
const OwnerProductsPage = lazy(() => import('./pages/OwnerProductsPage'));
const OwnerAddProductPage = lazy(() => import('./pages/OwnerAddProductPage'));
const OwnerEditProductPage = lazy(() => import('./pages/OwnerEditProductPage'));
const OwnerServicesPage = lazy(() => import('./pages/OwnerServicesPage'));
const OwnerAddServicePage = lazy(() => import('./pages/OwnerAddServicePage'));
const OwnerEditServicePage = lazy(() => import('./pages/OwnerEditServicePage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductEditPage = lazy(() => import('./pages/AdminProductEditPage'));
const AllCategoriesPage = lazy(() => import('./pages/AllCategoriesPage'));
const AllShopsPage = lazy(() => import('./pages/AllShopsPage'));
const AllServicesPage = lazy(() => import('./pages/AllServicesPage'));

const PageFallback = () => (
    <div className="container mx-auto px-4 py-10">
        <p className="text-sm font-medium text-gray-500">Loading...</p>
    </div>
);

const resolveApiBaseUrl = () => {
    const fallbackBaseUrl = 'http://localhost:5000/api';
    const configuredBaseUrl = String(import.meta.env.VITE_API_URL || fallbackBaseUrl).trim();

    if (!configuredBaseUrl) {
        return fallbackBaseUrl;
    }

    const normalized = configuredBaseUrl.replace(/\/+$/, '');
    if (/\/api(\/|$)/i.test(normalized)) {
        return normalized;
    }

    return `${normalized}/api`;
};

const hasValidLocation = (location) => {
    const city = String(location?.city || '').trim();
    const area = String(location?.area || '').trim();
    return Boolean(city && area);
};

const resolveOnboardingCompleted = (payload = {}) => {
    if (payload.role && payload.role !== 'user') {
        return true;
    }

    const hasProfileLocation = hasValidLocation(payload.location);
    if (typeof payload.onboardingCompleted === 'boolean') {
        return payload.onboardingCompleted || hasProfileLocation;
    }

    return hasProfileLocation;
};

function App() {
    const [sessionBootstrapped, setSessionBootstrapped] = useState(false);

    useEffect(() => {
        let mounted = true;

        const bootstrapSession = async () => {
            try {
                const response = await fetch(`${resolveApiBaseUrl()}/auth/session`, {
                    credentials: 'include',
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('userProfile');
                        window.dispatchEvent(new Event('storage'));
                    }
                    throw new Error(`Session check failed with status ${response.status}`);
                }
                const data = await response.json();

                localStorage.setItem('authToken', 'session');
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

                const onboardingCompleted = resolveOnboardingCompleted(data);
                localStorage.setItem('onboarding_complete', onboardingCompleted ? 'true' : 'false');

                const locationPermissionGranted =
                    typeof data.locationPermissionGranted === 'boolean'
                        ? data.locationPermissionGranted
                        : hasValidLocation(data.location);
                if (locationPermissionGranted) {
                    localStorage.setItem('location_permission_granted', 'true');
                } else {
                    localStorage.removeItem('location_permission_granted');
                }

                if (data.location?.city && data.location?.area) {
                    localStorage.setItem(
                        'selectedLocation',
                        JSON.stringify({
                            city: data.location.city,
                            area: data.location.area,
                        })
                    );
                }

                window.dispatchEvent(new Event('storage'));
            } catch (error) {
                // Keep existing local session hints on transient/network failures.
            } finally {
                if (mounted) {
                    setSessionBootstrapped(true);
                }
            }
        };

        bootstrapSession();
        return () => {
            mounted = false;
        };
    }, []);

    if (!sessionBootstrapped) {
        return <PageFallback />;
    }

    return (
        <div className="relative flex min-h-screen flex-col overflow-x-clip bg-light pb-[70px] pt-[76px] md:pb-0">
            <div
                aria-hidden="true"
                className="app-atmosphere pointer-events-none fixed left-1/2 top-[-280px] z-0 h-[560px] w-[1180px] -translate-x-1/2 rounded-full"
            />
            <Navbar />
            <FlashBanner />
            <GlobalSavingOverlay />
            <InstallAppPrompt />
            <OnboardingOverlay />

            <main className="relative z-10 flex-grow">
                <Suspense fallback={<PageFallback />}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/category/:id" element={<CategoryPage />} />
                        <Route
                            path="/cart"
                            element={
                                <RouteGuard requireAuth>
                                    <CartPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/shop/:id"
                            element={<ShopDetailsPage />}
                        />
                        <Route path="/product/:id" element={<ProductDetailsPage />} />
                        <Route path="/service/:id" element={<ServiceDetailsPage />} />
                        <Route
                            path="/auth"
                            element={
                                <RouteGuard guestOnly>
                                    <AuthPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <RouteGuard requireAuth>
                                    <UserProfilePage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/shop"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <ShopProfilePage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/products"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <OwnerProductsPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/products/new"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <OwnerAddProductPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/products/:productId/edit"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <OwnerEditProductPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/services"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <OwnerServicesPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/services/new"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <OwnerAddServicePage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/owner/services/:serviceId/edit"
                            element={
                                <RouteGuard requireAuth allowRoles={['shop_owner', 'admin']}>
                                    <OwnerEditServicePage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <RouteGuard requireAuth allowRoles={['admin']}>
                                    <AdminDashboardPage />
                                </RouteGuard>
                            }
                        />
                        <Route
                            path="/admin/products/:id/edit"
                            element={
                                <RouteGuard requireAuth allowRoles={['admin']}>
                                    <AdminProductEditPage />
                                </RouteGuard>
                            }
                        />
                        <Route path="/categories" element={<AllCategoriesPage />} />
                        <Route path="/shops/all" element={<AllShopsPage />} />
                        <Route path="/services/all" element={<AllServicesPage />} />
                    </Routes>
                </Suspense>
            </main>

            <Footer />
            <BottomNav />
        </div>
    );
}

export default App;
