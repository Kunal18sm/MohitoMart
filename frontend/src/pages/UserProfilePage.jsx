import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import SuggestionInput from '../components/SuggestionInput';
import ConfirmDialog from '../components/ConfirmDialog';

const UserProfilePage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profile, setProfile] = useState(null);
    const [addressIndexToDelete, setAddressIndexToDelete] = useState(null);
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        city: '',
        area: '',
        savedAddresses: []
    });

    const isShopOwner = useMemo(() => profile?.role === 'shop_owner', [profile?.role]);
    const areaOptions = useMemo(
        () => getAreaOptionsByCity(profileForm.city),
        [getAreaOptionsByCity, profileForm.city]
    );
    const addressToDelete = useMemo(() => {
        if (addressIndexToDelete === null) {
            return null;
        }
        return profileForm.savedAddresses[addressIndexToDelete] || null;
    }, [addressIndexToDelete, profileForm.savedAddresses]);

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
                savedAddresses: data.savedAddresses || []
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
                savedAddresses: profileForm.savedAddresses,
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

    const deleteSavedAddress = () => {
        if (addressIndexToDelete === null) {
            return;
        }

        setProfileForm((prev) => ({
            ...prev,
            savedAddresses: prev.savedAddresses.filter((_, index) => index !== addressIndexToDelete),
        }));
        setAddressIndexToDelete(null);
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

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-dark">Saved Addresses</h2>
                    <button
                        type="button"
                        onClick={() => {
                            setProfileForm(prev => ({
                                ...prev,
                                savedAddresses: [...prev.savedAddresses, { title: 'New', address: '', city: prev.city, area: prev.area, isDefault: prev.savedAddresses.length === 0 }]
                            }));
                        }}
                        className="rounded-lg bg-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary"
                    >
                        + Add Address
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {profileForm.savedAddresses.map((addr, idx) => (
                        <div key={idx} className="rounded-xl border border-gray-100 p-4 bg-light relative group">
                            <button
                                onClick={() => setAddressIndexToDelete(idx)}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <input
                                value={addr.title}
                                onChange={e => {
                                    const newArr = [...profileForm.savedAddresses];
                                    newArr[idx].title = e.target.value;
                                    setProfileForm({ ...profileForm, savedAddresses: newArr });
                                }}
                                className="text-sm font-bold bg-transparent outline-none mb-1 text-dark w-full"
                                placeholder="Title (e.g. Home, Work)"
                            />
                            <textarea
                                value={addr.address}
                                onChange={e => {
                                    const newArr = [...profileForm.savedAddresses];
                                    newArr[idx].address = e.target.value;
                                    setProfileForm({ ...profileForm, savedAddresses: newArr });
                                }}
                                className="text-xs text-gray-600 bg-transparent outline-none w-full border-b border-gray-200 mb-1"
                                placeholder="Full address"
                                rows="2"
                            />
                            <div className="flex items-center gap-2 mt-2">
                                <label className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="defaultAddress"
                                        checked={addr.isDefault}
                                        onChange={() => {
                                            const newArr = profileForm.savedAddresses.map((a, i) => ({ ...a, isDefault: i === idx }));
                                            setProfileForm({ ...profileForm, savedAddresses: newArr });
                                        }}
                                        className="text-primary focus:ring-primary"
                                    />
                                    Default Delivery
                                </label>
                            </div>
                        </div>
                    ))}
                    {profileForm.savedAddresses.length === 0 && (
                        <p className="text-sm text-gray-500 col-span-2">No saved addresses yet.</p>
                    )}
                </div>
                {profileForm.savedAddresses.length > 0 && (
                    <button
                        type="button"
                        onClick={updateProfile}
                        disabled={savingProfile}
                        className="mt-4 rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-60"
                    >
                        {savingProfile ? 'Saving...' : 'Save Addresses'}
                    </button>
                )}
            </div>

            <ConfirmDialog
                open={addressIndexToDelete !== null}
                title="Delete Address?"
                message={`Do you really want to delete "${addressToDelete?.title || 'this saved address'}"?`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={deleteSavedAddress}
                onCancel={() => setAddressIndexToDelete(null)}
                danger
            />
        </div>
    );
};

export default UserProfilePage;
