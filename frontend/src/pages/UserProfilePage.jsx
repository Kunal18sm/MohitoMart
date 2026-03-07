import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import SuggestionInput from '../components/SuggestionInput';

const UserProfilePage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profile, setProfile] = useState(null);
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        city: '',
        area: '',
    });

    const isShopOwner = useMemo(() => profile?.role === 'shop_owner', [profile?.role]);
    const areaOptions = useMemo(
        () => getAreaOptionsByCity(profileForm.city),
        [getAreaOptionsByCity, profileForm.city]
    );

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

            setProfile(data);
            setProfileForm({
                name: data.name || '',
                email: data.email || '',
                city: data.location?.city || '',
                area: data.location?.area || '',
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
            setSavingProfile(true);
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

            const { data } = await api.put('/users/profile', payload);
            setProfile((previous) => ({
                ...previous,
                ...data,
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
        } finally {
            setSavingProfile(false);
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
                <h1 className="text-3xl font-black text-dark">My Profile</h1>
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
                    <Link
                        to="/owner/services"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                    >
                        Manage Services
                    </Link>
                </div>
            )}

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-6">
                <h2 className="mb-4 text-xl font-black text-dark">Profile Settings</h2>
                <form onSubmit={updateProfile} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Name</label>
                        <input
                            type="text"
                            placeholder="Full name"
                            aria-label="Full name"
                            value={profileForm.name}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
                        <input
                            type="email"
                            placeholder="Email"
                            aria-label="Email"
                            value={profileForm.email}
                            onChange={(event) =>
                                setProfileForm((previous) => ({ ...previous, email: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">City</label>
                        <SuggestionInput
                            placeholder="City"
                            ariaLabel="City"
                            value={profileForm.city}
                            options={cityOptions}
                            onChange={(nextValue) =>
                                setProfileForm((previous) => ({ ...previous, city: nextValue }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Area</label>
                        <SuggestionInput
                            placeholder="Area"
                            ariaLabel="Area"
                            value={profileForm.area}
                            options={areaOptions}
                            onChange={(nextValue) =>
                                setProfileForm((previous) => ({ ...previous, area: nextValue }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={savingProfile}
                        className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-60 md:col-span-2"
                    >
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UserProfilePage;
