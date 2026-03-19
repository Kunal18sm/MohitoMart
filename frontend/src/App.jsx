import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import FlashBanner from './components/FlashBanner';
import Footer from './components/Footer';
import GlobalSavingOverlay from './components/GlobalSavingOverlay';
import BottomNav from './components/BottomNav';
import Seo from './components/Seo';
import RouteGuard from './components/RouteGuard';
import { applyAccessibilityEnhancements } from './utils/accessibility';
import { humanizeSegment, toAbsoluteUrl } from './utils/seo';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const FollowedFeedPage = lazy(() => import('./pages/FollowedFeedPage'));
const ProductDetailsPage = lazy(() => import('./pages/ProductDetailsPage'));
const ServiceDetailsPage = lazy(() => import('./pages/ServiceDetailsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ShopDetailsPage = lazy(() => import('./pages/ShopDetailsPage'));
const ShopProductsPage = lazy(() => import('./pages/ShopProductsPage'));
const ShopServicesPage = lazy(() => import('./pages/ShopServicesPage'));
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
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const TermsConditionsPage = lazy(() => import('./pages/TermsConditionsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const ContactUsPage = lazy(() => import('./pages/ContactUsPage'));
const InstallAppPrompt = lazy(() => import('./components/InstallAppPrompt'));
const OnboardingOverlay = lazy(() => import('./components/OnboardingOverlay'));
const CSRF_STORAGE_KEY = 'mm_csrf_token';
const READABLE_SESSION_COOKIE_KEY = 'mm_csrf';
const GA_MEASUREMENT_ID = 'G-JT69YMLED0';
const PUBLIC_ROUTE_PATTERNS = [
    /^\/$/,
    /^\/category\/[^/]+$/,
    /^\/shop\/[^/]+$/,
    /^\/product\/[^/]+$/,
    /^\/service\/[^/]+$/,
    /^\/categories$/,
    /^\/shops\/all$/,
    /^\/services\/all$/,
    /^\/about-us$/,
    /^\/terms-and-conditions$/,
    /^\/privacy-policy$/,
    /^\/contact-us$/,
];

const HomePageFallback = () => (
    <div className="pb-12">
        <section className="container mx-auto px-4 py-4 md:py-8">
            <div className="mx-auto aspect-[16/9] w-full max-w-full animate-pulse rounded-[2rem] border border-white/70 bg-white/80 md:max-w-[760px]" />
        </section>

        <section className="container mx-auto px-4 pb-2">
            <div className="h-[56px] animate-pulse rounded-xl border border-gray-200 bg-white/90" />
        </section>

        <section className="container mx-auto px-4 py-4">
            <div className="mb-4 h-7 w-52 animate-pulse rounded-full bg-gray-200/80" />
            <div className="flex gap-3 overflow-hidden">
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="flex min-w-[72px] shrink-0 flex-col items-center">
                        <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200/90" />
                        <div className="mt-2 h-3 w-14 animate-pulse rounded-full bg-gray-200/80" />
                    </div>
                ))}
            </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-10">
            <div className="min-h-[320px] animate-pulse rounded-[2.5rem] border border-primary/20 bg-white/70" />
        </section>

        <section className="container mx-auto px-4 py-4 md:py-6">
            <div className="mb-5 h-7 w-44 animate-pulse rounded-full bg-gray-200/80" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="h-[220px] animate-pulse rounded-2xl bg-white/80" />
                ))}
            </div>
        </section>
    </div>
);

const ProfilePageFallback = () => (
    <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-white/85" />
            <div className="grid gap-4 md:grid-cols-2">
                <div className="h-56 animate-pulse rounded-3xl bg-white/85" />
                <div className="h-56 animate-pulse rounded-3xl bg-white/85" />
            </div>
        </div>
    </div>
);

const PageFallback = ({ variant = 'default' }) => {
    if (variant === 'home') {
        return <HomePageFallback />;
    }

    if (variant === 'profile') {
        return <ProfilePageFallback />;
    }

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="h-6 w-28 animate-pulse rounded-full bg-gray-200/80" />
            <div className="mt-4 h-40 animate-pulse rounded-3xl bg-white/80" />
        </div>
    );
};

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

const readCookieValue = (name) => {
    if (typeof document === 'undefined') {
        return '';
    }

    const segments = document.cookie.split(';').map((segment) => segment.trim());
    const cookie = segments.find((segment) => segment.startsWith(`${name}=`));
    if (!cookie) {
        return '';
    }

    return decodeURIComponent(cookie.slice(name.length + 1));
};

const isPublicRoutePath = (pathname = '/') =>
    PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(String(pathname || '').trim()));

const shouldMountOnboardingOverlay = () =>
    localStorage.getItem('onboarding_complete') !== 'true';

const PRIVATE_ROUTE_PATTERNS = [
    /^\/auth$/,
    /^\/cart$/,
    /^\/followed-feed$/,
    /^\/profile$/,
    /^\/owner(\/|$)/,
    /^\/admin(\/|$)/,
];

const normalizePathname = (pathname = '/') => {
    const normalized = String(pathname || '/')
        .split('#')[0]
        .split('?')[0]
        .trim()
        .replace(/\/{2,}/g, '/');

    if (!normalized) {
        return '/';
    }

    if (normalized !== '/' && normalized.endsWith('/')) {
        return normalized.slice(0, -1);
    }

    return normalized;
};

const toTitleCase = (value = '') =>
    humanizeSegment(value)
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();

const isPrivateRoutePath = (pathname = '/') =>
    PRIVATE_ROUTE_PATTERNS.some((pattern) => pattern.test(normalizePathname(pathname)));

const buildRouteSeo = (pathname = '/') => {
    const normalizedPath = normalizePathname(pathname);
    const siteRootUrl = toAbsoluteUrl('/');

    if (normalizedPath === '/') {
        return {
            title: 'Mohito Mart - Local Shops Marketplace',
            description:
                'Find nearby shops, products, and services in your area on Mohito Mart.',
            path: '/',
            type: 'website',
            structuredData: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: 'Mohito Mart',
                    url: siteRootUrl,
                    logo: toAbsoluteUrl('/logo/mohito-512-optimized.png'),
                },
                {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: 'Mohito Mart',
                    url: siteRootUrl,
                },
            ],
        };
    }

    if (normalizedPath === '/categories') {
        return {
            title: 'All Categories',
            description:
                'Explore all product and service categories available on Mohito Mart.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (/^\/category\/[^/]+$/i.test(normalizedPath)) {
        const categorySegment = normalizedPath.split('/')[2] || '';
        const categoryLabel = toTitleCase(categorySegment) || 'Category';
        return {
            title: `${categoryLabel} Near You`,
            description: `Browse ${categoryLabel} products and services from nearby local shops.`,
            path: normalizedPath,
            type: 'website',
        };
    }

    if (/^\/shop\/[^/]+\/products$/i.test(normalizedPath)) {
        return {
            title: 'Shop Products',
            description: 'Browse all products listed by this shop on Mohito Mart.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (/^\/shop\/[^/]+\/services$/i.test(normalizedPath)) {
        return {
            title: 'Shop Services',
            description: 'Browse all services listed by this shop on Mohito Mart.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (/^\/shop\/[^/]+$/i.test(normalizedPath)) {
        return {
            title: 'Shop Details',
            description: 'See shop profile, products, services, ratings, and contact details.',
            path: normalizedPath,
            type: 'business.business',
        };
    }

    if (/^\/product\/[^/]+$/i.test(normalizedPath)) {
        return {
            title: 'Product Details',
            description: 'View product details, pricing, and shop information on Mohito Mart.',
            path: normalizedPath,
            type: 'product',
        };
    }

    if (/^\/service\/[^/]+$/i.test(normalizedPath)) {
        return {
            title: 'Service Details',
            description: 'View service details, pricing, and provider information on Mohito Mart.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (normalizedPath === '/shops/all') {
        return {
            title: 'All Listed Shops',
            description: 'Discover all listed shops available in your selected area and city.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (normalizedPath === '/services/all') {
        return {
            title: 'All Services',
            description: 'Explore all available services from nearby shops on Mohito Mart.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (normalizedPath === '/about-us') {
        return {
            title: 'About Us',
            description: 'Learn about Mohito Mart and our mission for local shopping discovery.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (normalizedPath === '/contact-us') {
        return {
            title: 'Contact Us',
            description: 'Contact Mohito Mart support and get help with your account or listing.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (normalizedPath === '/privacy-policy') {
        return {
            title: 'Privacy Policy',
            description: 'Read how Mohito Mart handles and protects your personal data.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (normalizedPath === '/terms-and-conditions') {
        return {
            title: 'Terms and Conditions',
            description: 'Read the terms and conditions for using Mohito Mart.',
            path: normalizedPath,
            type: 'website',
        };
    }

    if (isPrivateRoutePath(normalizedPath)) {
        return {
            title: 'Account',
            description: 'Private Mohito Mart account area.',
            path: normalizedPath,
            type: 'website',
            noindex: true,
            robots: 'noindex,nofollow',
        };
    }

    return {
        title: 'Mohito Mart',
        description:
            'Mohito Mart helps nearby shoppers discover local shops, products, and services.',
        path: normalizedPath,
        type: 'website',
        noindex: true,
        robots: 'noindex,nofollow',
    };
};

function App() {
    const [sessionBootstrapped, setSessionBootstrapped] = useState(
        () => !Boolean(localStorage.getItem('authToken'))
    );
    const [installPromptReady, setInstallPromptReady] = useState(false);
    const [onboardingOverlayEnabled, setOnboardingOverlayEnabled] = useState(() =>
        shouldMountOnboardingOverlay()
    );
    const lastTrackedPathRef = useRef('');
    const location = useLocation();
    const showFooter = location.pathname === '/' || location.pathname === '/profile';
    const isPublicRoute = useMemo(() => isPublicRoutePath(location.pathname), [location.pathname]);
    const canRenderRoutes = isPublicRoute || sessionBootstrapped;
    const routeSeo = useMemo(() => buildRouteSeo(location.pathname), [location.pathname]);
    const pageFallbackVariant =
        location.pathname === '/' ? 'home' : location.pathname === '/profile' ? 'profile' : 'default';

    useEffect(() => {
        const syncOnboardingOverlay = () => {
            setOnboardingOverlayEnabled(shouldMountOnboardingOverlay());
        };

        syncOnboardingOverlay();
        window.addEventListener('storage', syncOnboardingOverlay);
        return () => {
            window.removeEventListener('storage', syncOnboardingOverlay);
        };
    }, []);

    useEffect(() => {
        let idleId = null;
        let timeoutId = null;

        const enableInstallPrompt = () => {
            setInstallPromptReady(true);
        };

        if ('requestIdleCallback' in window) {
            idleId = window.requestIdleCallback(enableInstallPrompt, { timeout: 2200 });
        } else {
            timeoutId = window.setTimeout(enableInstallPrompt, 1200);
        }

        return () => {
            if (idleId !== null && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleId);
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    useEffect(() => {
        const hasStoredSession = Boolean(localStorage.getItem('authToken'));
        const hasReadableSessionCookie = Boolean(readCookieValue(READABLE_SESSION_COOKIE_KEY));

        if (!hasStoredSession && !hasReadableSessionCookie) {
            setSessionBootstrapped(true);
            return undefined;
        }

        let mounted = true;
        const timeoutId = window.setTimeout(() => {
            if (mounted) {
                setSessionBootstrapped(true);
            }
        }, 1200);

        const bootstrapSession = async () => {
            try {
                const response = await fetch(`${resolveApiBaseUrl()}/auth/session`, {
                    credentials: 'include',
                });

                const csrfToken = String(response.headers.get('x-csrf-token') || '').trim();
                if (csrfToken) {
                    localStorage.setItem(CSRF_STORAGE_KEY, csrfToken);
                }

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
                    window.clearTimeout(timeoutId);
                    setSessionBootstrapped(true);
                }
            }
        };

        bootstrapSession();
        return () => {
            window.clearTimeout(timeoutId);
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const applyLabels = () => applyAccessibilityEnhancements(document);
        let idleId = null;
        let timeoutId = null;

        if ('requestIdleCallback' in window) {
            idleId = window.requestIdleCallback(applyLabels, { timeout: 1500 });
        } else {
            timeoutId = window.setTimeout(applyLabels, 500);
        }

        return () => {
            if (idleId !== null && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleId);
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [location.pathname, sessionBootstrapped]);

    useEffect(() => {
        const currentPath = `${location.pathname}${location.search}${location.hash}`;
        if (lastTrackedPathRef.current === currentPath) {
            return;
        }

        lastTrackedPathRef.current = currentPath;

        if (typeof window.gtag !== 'function') {
            return;
        }

        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        if (isLocalhost) {
            return;
        }

        window.gtag('event', 'page_view', {
            send_to: GA_MEASUREMENT_ID,
            page_path: currentPath,
            page_location: window.location.href,
            page_title: document.title,
        });
    }, [location.pathname, location.search, location.hash]);

    return (
        <div className="relative flex min-h-screen flex-col overflow-x-clip bg-light pb-[70px] pt-[76px] md:pb-0">
            <Seo
                title={routeSeo.title}
                description={routeSeo.description}
                path={routeSeo.path}
                type={routeSeo.type}
                robots={routeSeo.robots}
                noindex={routeSeo.noindex}
                structuredData={routeSeo.structuredData}
            />
            <div
                aria-hidden="true"
                className="app-atmosphere pointer-events-none fixed left-1/2 top-[-280px] z-0 h-[560px] w-[1180px] -translate-x-1/2 rounded-full"
            />
            <Navbar />
            <FlashBanner />
            <GlobalSavingOverlay />
            {installPromptReady ? (
                <Suspense fallback={null}>
                    <InstallAppPrompt />
                </Suspense>
            ) : null}
            {onboardingOverlayEnabled ? (
                <Suspense fallback={null}>
                    <OnboardingOverlay />
                </Suspense>
            ) : null}

            <main className="relative z-10 flex-grow">
                {canRenderRoutes ? (
                    <Suspense fallback={<PageFallback variant={pageFallbackVariant} />}>
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
                                path="/followed-feed"
                                element={
                                    <RouteGuard requireAuth>
                                        <FollowedFeedPage />
                                    </RouteGuard>
                                }
                            />
                            <Route
                                path="/shop/:id"
                                element={<ShopDetailsPage />}
                            />
                            <Route path="/shop/:id/products" element={<ShopProductsPage />} />
                            <Route path="/shop/:id/services" element={<ShopServicesPage />} />
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
                            <Route path="/about-us" element={<AboutUsPage />} />
                            <Route
                                path="/terms-and-conditions"
                                element={<TermsConditionsPage />}
                            />
                            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                            <Route path="/contact-us" element={<ContactUsPage />} />
                        </Routes>
                    </Suspense>
                ) : (
                    <PageFallback variant={pageFallbackVariant} />
                )}
            </main>

            {showFooter ? <Footer /> : null}
            <BottomNav />
        </div>
    );
}

export default App;
