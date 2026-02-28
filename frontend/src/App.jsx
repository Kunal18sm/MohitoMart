import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import FlashBanner from './components/FlashBanner';
import Footer from './components/Footer';
import GlobalSavingOverlay from './components/GlobalSavingOverlay';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ProductDetailsPage = lazy(() => import('./pages/ProductDetailsPage'));
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

const RouteFallback = () => (
    <div className="container mx-auto px-4 py-10">
        <div className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white/70" />
    </div>
);

function App() {
    return (
        <div className="relative flex min-h-screen flex-col overflow-x-clip bg-light pt-[76px]">
            <div
                aria-hidden="true"
                className="app-atmosphere pointer-events-none fixed left-1/2 top-[-280px] z-0 h-[560px] w-[1180px] -translate-x-1/2 rounded-full"
            />
            <Navbar />
            <FlashBanner />
            <GlobalSavingOverlay />

            <main className="relative z-10 flex-grow">
                <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/category/:id" element={<CategoryPage />} />
                        <Route path="/shop/:id" element={<ShopDetailsPage />} />
                        <Route path="/product/:id" element={<ProductDetailsPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/profile" element={<UserProfilePage />} />
                        <Route path="/owner/shop" element={<ShopProfilePage />} />
                        <Route path="/owner/products" element={<OwnerProductsPage />} />
                        <Route path="/owner/products/new" element={<OwnerAddProductPage />} />
                        <Route path="/owner/products/:productId/edit" element={<OwnerEditProductPage />} />
                        <Route path="/owner/services" element={<OwnerServicesPage />} />
                        <Route path="/owner/services/new" element={<OwnerAddServicePage />} />
                        <Route path="/owner/services/:serviceId/edit" element={<OwnerEditServicePage />} />
                        <Route path="/admin" element={<AdminDashboardPage />} />
                        <Route path="/admin/products/:id/edit" element={<AdminProductEditPage />} />
                        <Route path="/categories" element={<AllCategoriesPage />} />
                        <Route path="/shops/all" element={<AllShopsPage />} />
                        <Route path="/services/all" element={<AllServicesPage />} />
                    </Routes>
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}

export default App;
