import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Home,
    Category,
    Store,
    FavoriteBorder,
    Person,
    Dashboard,
    MiscellaneousServices,
} from '@mui/icons-material';

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

    // Base links for all users
    let navLinks = [
        { path: '/', label: t('home'), icon: <Home /> },
        { path: '/categories', label: t('categories'), icon: <Category /> },
        { path: '/shops/all', label: t('shops'), icon: <Store /> },
    ];

    // Role-specific additions
    if (isShopOwner) {
        navLinks = [
            { path: '/', label: t('home'), icon: <Home /> },
            { path: '/owner/shop', label: t('dashboard'), icon: <Dashboard /> },
            { path: '/cart', label: t('wishlist'), icon: <FavoriteBorder /> },
            { path: '/owner/services', label: t('services'), icon: <MiscellaneousServices /> },
            { path: '/profile', label: t('profile'), icon: <Person /> },
        ];
    } else if (isAdmin) {
        navLinks = [
            { path: '/', label: t('home'), icon: <Home /> },
            { path: '/admin', label: t('dashboard'), icon: <Dashboard /> },
            { path: '/cart', label: t('wishlist'), icon: <FavoriteBorder /> },
            { path: '/services/all', label: t('services'), icon: <MiscellaneousServices /> },
            { path: '/profile', label: t('profile'), icon: <Person /> },
        ];
    } else {
        // Normal User
        navLinks.push(
            { path: '/cart', label: t('wishlist'), icon: <FavoriteBorder /> },
            { path: '/profile', label: t('profile'), icon: <Person /> }
        );
    }

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
                                    {React.cloneElement(link.icon, { fontSize: 'small' })}
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
