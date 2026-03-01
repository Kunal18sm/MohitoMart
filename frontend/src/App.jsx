import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import FlashBanner from './components/FlashBanner';
import Footer from './components/Footer';
import GlobalSavingOverlay from './components/GlobalSavingOverlay';
import InstallAppPrompt from './components/InstallAppPrompt';

import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ServiceDetailsPage from './pages/ServiceDetailsPage';
import UserProfilePage from './pages/UserProfilePage';
import ShopDetailsPage from './pages/ShopDetailsPage';
import AuthPage from './pages/AuthPage';
import ShopProfilePage from './pages/ShopProfilePage';
import OwnerProductsPage from './pages/OwnerProductsPage';
import OwnerAddProductPage from './pages/OwnerAddProductPage';
import OwnerEditProductPage from './pages/OwnerEditProductPage';
import OwnerServicesPage from './pages/OwnerServicesPage';
import OwnerAddServicePage from './pages/OwnerAddServicePage';
import OwnerEditServicePage from './pages/OwnerEditServicePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminProductEditPage from './pages/AdminProductEditPage';
import AllCategoriesPage from './pages/AllCategoriesPage';
import AllShopsPage from './pages/AllShopsPage';
import AllServicesPage from './pages/AllServicesPage';

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
            <InstallAppPrompt />

            <main className="relative z-10 flex-grow">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/category/:id" element={<CategoryPage />} />
                        <Route path="/shop/:id" element={<ShopDetailsPage />} />
                        <Route path="/product/:id" element={<ProductDetailsPage />} />
                        <Route path="/service/:id" element={<ServiceDetailsPage />} />
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
            </main>

            <Footer />
        </div>
    );
}

export default App;
