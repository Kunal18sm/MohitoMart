import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('authToken')));
    const [locationLabel, setLocationLabel] = useState('Set location');

    useEffect(() => {
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('mohito_theme');

        const handleStorage = () => {
            setIsLoggedIn(Boolean(localStorage.getItem('authToken')));
            const location = JSON.parse(localStorage.getItem('selectedLocation') || '{}');
            setLocationLabel(
                location.city && location.area ? `${location.area}, ${location.city}` : 'Set location'
            );
        };

        handleStorage();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const authLabel = useMemo(() => (isLoggedIn ? 'Profile' : 'Login / Signup'), [isLoggedIn]);

    return (
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                    <Link to="/" className="leading-tight">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                            Local Marketplace
                        </p>
                        <p className="text-xl font-black tracking-tight text-dark sm:text-2xl">
                            MOHITO <span className="text-primary">MART</span>
                        </p>
                    </Link>

                    <div className="hidden items-center gap-6 text-sm font-semibold text-gray-600 lg:flex">
                        <Link to="/" className="transition-colors hover:text-primary">
                            Discover
                        </Link>
                        <Link
                            to={isLoggedIn ? '/profile' : '/auth'}
                            className="transition-colors hover:text-primary"
                        >
                            {authLabel}
                        </Link>
                    </div>

                    <div className="hidden items-center gap-3 md:flex">
                        <span className="rounded-full bg-light px-4 py-2 text-sm font-medium text-gray-600">
                            {locationLabel}
                        </span>
                        <Link
                            to={isLoggedIn ? '/profile' : '/auth'}
                            className="rounded-full bg-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                        >
                            {authLabel}
                        </Link>
                    </div>

                    <button
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-dark md:hidden"
                        onClick={() => setIsMenuOpen((previous) => !previous)}
                        type="button"
                    >
                        {isMenuOpen ? 'Close' : 'Menu'}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="mt-3 space-y-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-lg md:hidden">
                        <div className="rounded-lg bg-light px-3 py-2 text-sm font-medium text-gray-600">
                            {locationLabel}
                        </div>
                        <Link
                            to="/"
                            onClick={() => setIsMenuOpen(false)}
                            className="block rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-light"
                        >
                            Discover
                        </Link>
                        <Link
                            to={isLoggedIn ? '/profile' : '/auth'}
                            onClick={() => setIsMenuOpen(false)}
                            className="block rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-light"
                        >
                            {authLabel}
                        </Link>
                        <Link
                            to={isLoggedIn ? '/profile' : '/auth'}
                            onClick={() => setIsMenuOpen(false)}
                            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-dark px-3 py-2 text-sm font-semibold text-white hover:bg-primary"
                        >
                            {isLoggedIn ? 'Open Profile' : 'Login / Signup'}
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
