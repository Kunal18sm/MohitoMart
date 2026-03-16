import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import { detectDeviceLocation } from '../utils/deviceLocation';
import SuggestionInput from '../components/SuggestionInput';
import ProfileInstallButton from '../components/ProfileInstallButton';

const UserProfilePage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [profile, setProfile] = useState(null);
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        city: '',
        area: '',
    });
    const autoLocationAttemptedRef = useRef(false);

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
            let storedLocation = {};
            try {
                storedLocation = JSON.parse(localStorage.getItem('selectedLocation') || '{}');
            } catch (parseError) {
                storedLocation = {};
            }
            const fallbackCity = String(storedLocation.city || localStorage.getItem('user_city') || '').trim();
            const fallbackArea = String(storedLocation.area || localStorage.getItem('user_area') || '').trim();

            setProfileForm({
                name: data.name || '',
                email: data.email || '',
                city: data.location?.city || fallbackCity || '',
                area: data.location?.area || fallbackArea || '',
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

    const persistDetectedLocation = ({ city, area, latitude, longitude }) => {
        localStorage.setItem('user_city', city);
        localStorage.setItem('user_area', area);
        if (Number.isFinite(latitude)) {
            localStorage.setItem('user_lat', String(latitude));
        }
        if (Number.isFinite(longitude)) {
            localStorage.setItem('user_lon', String(longitude));
        }
        localStorage.setItem(
            'selectedLocation',
            JSON.stringify({
                city,
                area,
            })
        );
        localStorage.setItem('location_permission_granted', 'true');
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('app:location-updated'));
    };

    const autofillLocationFromDevice = async () => {
        if (detectingLocation) {
            return;
        }

        try {
            setDetectingLocation(true);
            const detected = await detectDeviceLocation({ timeoutMs: 9000 });
            setProfileForm((previous) => ({
                ...previous,
                city: detected.city,
                area: detected.area,
            }));
            persistDetectedLocation(detected);
            if (detected.isApproximate) {
                showSuccess(
                    `Approximate location: ${detected.area}, ${detected.city}. Please verify area.`
                );
            } else {
                showSuccess(`Location detected: ${detected.area}, ${detected.city}`);
            }
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to detect your location'));
        } finally {
            setDetectingLocation(false);
        }
    };

    useEffect(() => {
        if (loading || !profile) {
            return;
        }

        const hasLocation = Boolean(profileForm.city && profileForm.area);
        if (hasLocation || autoLocationAttemptedRef.current) {
            return;
        }

        autoLocationAttemptedRef.current = true;
        autofillLocationFromDevice();
    }, [loading, profile, profileForm.city, profileForm.area]);

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
                name: profileForm.name.trim(),
                city: profileForm.city.trim(),
                area: profileForm.area.trim(),
            };

            if (!payload.name || !payload.city || !payload.area) {
                showError('Name, city and area are required');
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
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <ProfileInstallButton />
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                        Logout
                    </button>
                </div>
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
                <button
                    type="button"
                    onClick={autofillLocationFromDevice}
                    disabled={detectingLocation}
                    className="mb-5 inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                >
                    {detectingLocation ? 'Detecting location...' : 'Use my current location'}
                </button>
                <form onSubmit={updateProfile} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Name <span className="text-red-500">*</span>
                        </label>
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
                            readOnly
                            disabled
                            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 outline-none"
                        />
                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            City <span className="text-red-500">*</span>
                        </label>
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
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Area <span className="text-red-500">*</span>
                        </label>
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
