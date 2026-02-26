import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';

const UserProfilePage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        city: '',
        area: '',
        password: '',
    });

    const isShopOwner = useMemo(() => profile?.role === 'shop_owner', [profile?.role]);

    const loadProfile = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.get('/users/profile');

            if (data.role === 'admin') {
                navigate('/admin', { replace: true });
                return;
            }

            if (data.role === 'shop_owner') {
                navigate('/owner/shop', { replace: true });
                return;
            }

            setProfile(data);
            setProfileForm({
                name: data.name || '',
                email: data.email || '',
                city: data.location?.city || '',
                area: data.location?.area || '',
                password: '',
            });
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load profile'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // continue logout on client side
        }

        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
        window.dispatchEvent(new Event('storage'));
        navigate('/auth');
    };

    const updateProfile = async (event) => {
        event.preventDefault();
        try {
            const payload = {
                ...profileForm,
                name: profileForm.name.trim(),
                email: profileForm.email.trim().toLowerCase(),
                city: profileForm.city.trim(),
                area: profileForm.area.trim(),
            };

            if (!payload.name || !payload.email || !payload.city || !payload.area) {
                showError('Name, email, city and area are required');
                return;
            }

            if (payload.password && payload.password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }

            const { data } = await api.put('/users/profile', payload);
            setProfile((previous) => ({
                ...previous,
                ...data,
            }));
            setProfileForm((previous) => ({
                ...previous,
                password: '',
            }));

            localStorage.setItem(
                'selectedLocation',
                JSON.stringify({
                    city: data.location?.city,
                    area: data.location?.area,
                })
            );
            window.dispatchEvent(new Event('storage'));
            showSuccess('Profile updated successfully');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to update profile'));
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8 md:py-10">
            <div className="mb-8 flex items-center justify-between gap-3">
                <h1 className="text-4xl font-black text-dark">My Profile</h1>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                    Logout
                </button>
            </div>

            {isShopOwner && (
                <div className="mb-8 flex flex-wrap gap-3">
                    <Link
                        to="/owner/shop"
                        className="rounded-lg bg-dark px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
                    >
                        Shop Profile
                    </Link>
                    <Link
                        to="/owner/products"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                    >
                        Add Items
                    </Link>
                </div>
            )}

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-6">
                <h2 className="mb-4 text-2xl font-black text-dark">Profile Settings</h2>
                <form onSubmit={updateProfile} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Name</label>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={profileForm.name}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
                        <input
                            type="email"
                            placeholder="Email"
                            value={profileForm.email}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, email: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">City</label>
                        <input
                            type="text"
                            placeholder="City"
                            value={profileForm.city}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, city: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Area</label>
                        <input
                            type="text"
                            placeholder="Area"
                            value={profileForm.area}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, area: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            New Password (Optional)
                        </label>
                        <input
                            type="password"
                            placeholder="New password"
                            value={profileForm.password}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, password: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary md:col-span-2"
                    >
                        Save Profile
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserProfilePage;
