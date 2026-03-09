import { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const iconClassName = 'h-[18px] w-[18px]';

const HomeIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" />
    </svg>
);

const CategoryIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
);

const ShopIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18l-1.2 9.2A2 2 0 0 1 17.8 21H6.2a2 2 0 0 1-2-1.8L3 10Zm2-6h14l2 6H3l2-6Z" />
    </svg>
);

const WishlistIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12.1 20.3c-.1.1-.3.1-.4 0C6.5 15.6 3 12.6 3 8.8A4.8 4.8 0 0 1 7.8 4a4.9 4.9 0 0 1 4.2 2.3A4.9 4.9 0 0 1 16.2 4 4.8 4.8 0 0 1 21 8.8c0 3.8-3.5 6.8-8.9 11.5Z" />
    </svg>
);

const ProfileIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
    </svg>
);

const DashboardIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5h6v6H4zM14 5h6v4h-6zM14 11h6v8h-6zM4 13h6v6H4z" />
    </svg>
);

const ServicesIcon = () => (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3h2v4h-2zM4.9 6.3 6.3 4.9l2.8 2.8-1.4 1.4ZM3 11h4v2H3zm14 1a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm2-1h2v2h-2zm-4 8h2v2h-2zM6.3 19.1 4.9 17.7l2.8-2.8 1.4 1.4Z" />
    </svg>
);

const getStoredUserRole = () => {
    try {
        const storedProfile = localStorage.getItem('userProfile');
        if (!storedProfile) return 'user';
        const parsedProfile = JSON.parse(storedProfile);
        return parsedProfile?.role || 'user';
    } catch (error) {
        return 'user';
    }
};

const BottomNav = () => {
    const { t } = useTranslation();
    const [userRole, setUserRole] = useState(getStoredUserRole);

    useEffect(() => {
        const handleStorage = () => {
            setUserRole(getStoredUserRole());
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const isShopOwner = userRole === 'shop_owner';
    const isAdmin = userRole === 'admin';

    const navLinks = useMemo(() => {
        if (isShopOwner) {
            return [
                { path: '/', label: t('home'), Icon: HomeIcon },
                { path: '/owner/shop', label: t('dashboard'), Icon: DashboardIcon },
                { path: '/categories', label: t('categories'), Icon: CategoryIcon },
                { path: '/owner/services', label: t('services'), Icon: ServicesIcon },
                { path: '/profile', label: t('profile'), Icon: ProfileIcon },
            ];
        }

        if (isAdmin) {
            return [
                { path: '/', label: t('home'), Icon: HomeIcon },
                { path: '/admin', label: t('dashboard'), Icon: DashboardIcon },
                { path: '/cart', label: t('wishlist'), Icon: WishlistIcon },
                { path: '/services/all', label: t('services'), Icon: ServicesIcon },
                { path: '/profile', label: t('profile'), Icon: ProfileIcon },
            ];
        }

        return [
            { path: '/', label: t('home'), Icon: HomeIcon },
            { path: '/categories', label: t('categories'), Icon: CategoryIcon },
            { path: '/shops/all', label: t('shops'), Icon: ShopIcon },
            { path: '/cart', label: t('wishlist'), Icon: WishlistIcon },
            { path: '/profile', label: t('profile'), Icon: ProfileIcon },
        ];
    }, [isAdmin, isShopOwner, t]);

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-200 bg-white/80 pb-safe pt-2 backdrop-blur-lg md:hidden">
            <div className="flex justify-around">
                {navLinks.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full pb-2 ${isActive ? 'text-primary' : 'text-gray-500 hover:text-primary transition-colors'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                                    <link.Icon />
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                                    {link.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNav;
