import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const getStoredUserRole = () => {
    try {
        const storedProfile = localStorage.getItem('userProfile');
        if (!storedProfile) {
            return 'user';
        }

        const parsedProfile = JSON.parse(storedProfile);
        return parsedProfile?.role || 'user';
    } catch (error) {
        return 'user';
    }
};

const Navbar = () => {
    const { t, i18n } = useTranslation();
    const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('authToken')));
    const [userRole, setUserRole] = useState(getStoredUserRole);
    const [locationLabel, setLocationLabel] = useState('...');

    // Global search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('mohito_theme');

        const handleStorage = () => {
            setIsLoggedIn(Boolean(localStorage.getItem('authToken')));
            setUserRole(getStoredUserRole());
            const location = JSON.parse(localStorage.getItem('selectedLocation') || '{}');
            setLocationLabel(
                location.city && location.area
                    ? `${location.area}, ${location.city}`
                    : localStorage.getItem('user_city')
                        ? `${localStorage.getItem('user_area')}, ${localStorage.getItem('user_city')}`
                        : t('set_location') || 'Set location'
            );
        };

        handleStorage();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const primaryCtaPath = useMemo(() => {
        if (!isLoggedIn) {
            return '/auth';
        }

        if (userRole === 'admin') {
            return '/admin';
        }

        if (userRole === 'shop_owner') {
            return '/owner/shop';
        }

        return '/profile';
    }, [isLoggedIn, userRole]);

    const primaryCtaLabel = useMemo(() => {
        if (!isLoggedIn) {
            return t('login_signup') || 'Login / Signup';
        }

        if (userRole === 'admin') {
            return t('admin_panel') || 'Admin Panel';
        }

        if (userRole === 'shop_owner') {
            return t('shop_profile') || 'Shop Profile';
        }

        return t('account') || 'Account';
    }, [isLoggedIn, t, userRole]);

    return (
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                    <Link to="/" className="leading-tight">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                            {t('local_marketplace') || 'Local Marketplace'}
                        </p>
                        <p className="text-xl font-black tracking-tight text-dark sm:text-2xl">
                            MOHITO <span className="text-primary">MART</span>
                        </p>
                    </Link>

                    <div className="hidden items-center gap-6 text-sm font-semibold text-gray-600 xl:flex">
                        <Link to="/" className="transition-colors hover:text-primary">
                            {t('home') || 'Home'}
                        </Link>
                        <Link to="/services/all" className="transition-colors hover:text-primary">
                            {t('services') || 'Services'}
                        </Link>
                        {isLoggedIn && (
                            <Link to="/cart" className="transition-colors hover:text-primary">
                                {t('wishlist') || 'Wishlist'}
                            </Link>
                        )}
                    </div>

                    <div className="hidden flex-1 max-w-md relative mx-4 lg:block">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                placeholder={t('search_placeholder') || 'Search products, shops, services...'}
                                className="w-full rounded-full bg-gray-100/50 border border-transparent px-4 py-2 pl-10 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all focus:ring-4 focus:ring-primary/10"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Suggestions Dropdown Container */}
                        {isSearchFocused && searchQuery.length > 1 && (
                            <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl p-4 z-50">
                                <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                                    {t('suggestions') || 'Suggestions'}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-lg cursor-pointer">
                                        <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
                                        <div>
                                            <p className="line-clamp-1 text-sm font-medium text-dark">
                                                {searchQuery} {t('in_products') || 'in Products'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-lg cursor-pointer">
                                        <div className="h-8 w-8 bg-gray-200 rounded-md rounded-full"></div>
                                        <div>
                                            <p className="line-clamp-1 text-sm font-medium text-dark">
                                                {searchQuery} {t('in_shops') || 'in Shops'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden items-center gap-3 md:flex">
                        <button
                            onClick={() => {
                                const newLng = i18n.language === 'en' ? 'hi' : 'en';
                                i18n.changeLanguage(newLng);
                                localStorage.setItem('app_language', newLng);
                            }}
                            className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                        >
                            {i18n.language === 'en' ? 'HI' : 'EN'}
                        </button>
                        <span className="rounded-full bg-light px-4 py-2 text-sm font-medium text-gray-600">
                            {locationLabel}
                        </span>
                        <Link
                            to={primaryCtaPath}
                            className="rounded-full bg-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                        >
                            {primaryCtaLabel}
                        </Link>
                    </div>

                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={() => {
                                const newLng = i18n.language === 'en' ? 'hi' : 'en';
                                i18n.changeLanguage(newLng);
                                localStorage.setItem('app_language', newLng);
                            }}
                            className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
                        >
                            {i18n.language === 'en' ? 'HI' : 'EN'}
                        </button>
                        {isLoggedIn && (
                            <Link
                                to="/cart"
                                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-dark"
                            >
                                {t('wishlist') || 'Wishlist'}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
