import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { detectDeviceLocation } from '../utils/deviceLocation';
import api from '../services/api';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import SuggestionInput from './SuggestionInput';

const OnboardingOverlay = () => {
    const { t, i18n } = useTranslation();
    const { showError, showSuccess } = useFlash();
    const [step, setStep] = useState(0); // 0 = hidden, 1 = language, 2 = role, 3 = location
    const [loadingLoc, setLoadingLoc] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [role, setRole] = useState('user');
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');

    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();
    const areaOptions = useMemo(() => getAreaOptionsByCity(city), [getAreaOptionsByCity, city]);

    useEffect(() => {
        const checkStatus = () => {
            const hasAuthToken = Boolean(localStorage.getItem('authToken'));
            const hasCompletedOnboarding = localStorage.getItem('onboarding_complete');

            if (!hasAuthToken) {
                if (hasCompletedOnboarding !== 'true') {
                    setStep(1);
                } else {
                    setStep(0);
                }
                return;
            }

            if (hasAuthToken && hasCompletedOnboarding !== 'true') {
                setStep(1);
            } else {
                setStep(0);
            }
        };

        checkStatus();

        const handleStorage = () => {
            checkStatus();
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleLanguageSelect = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('app_language', lang);

        const hasAuthToken = Boolean(localStorage.getItem('authToken'));
        if (hasAuthToken) {
            setStep(2); // Go to role selection for logged in users
        } else {
            setStep(3); // Skip role selection for guests
        }
    };

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setStep(3);
    };

    const persistGuestLocation = ({ city, area, latitude, longitude }) => {
        localStorage.setItem('user_city', city);
        localStorage.setItem('user_area', area);
        localStorage.setItem('user_lat', String(latitude));
        localStorage.setItem('user_lon', String(longitude));
        localStorage.setItem(
            'selectedLocation',
            JSON.stringify({ city, area })
        );
    };

    const handleLocationDetect = async () => {
        setLoadingLoc(true);
        try {
            const detected = await detectDeviceLocation({ timeoutMs: 15000 });
            setCity(detected.city);
            setArea(detected.area);
            persistGuestLocation(detected);
            if (detected.isApproximate) {
                showSuccess(
                    `Approximate location: ${detected.area}, ${detected.city}. Please verify area.`
                );
            } else {
                showSuccess(`Location detected: ${detected.area}, ${detected.city}`);
            }
        } catch (error) {
            console.error('Location detection failed:', error);
            showError(error?.message || 'Unable to detect your location automatically');
        } finally {
            setLoadingLoc(false);
        }
    };

    const completeOnboarding = async () => {
        const hasAuthToken = Boolean(localStorage.getItem('authToken'));

        if (hasAuthToken) {
            if (!city || !area) {
                showError('City and Area are required');
                return;
            }

            setIsSubmitting(true);
            try {
                const { data } = await api.put('/auth/onboarding', {
                    role,
                    city,
                    area
                });

                localStorage.setItem('onboarding_complete', 'true');
                localStorage.setItem(
                    'userProfile',
                    JSON.stringify({
                        id: data._id,
                        name: data.name,
                        email: data.email,
                        role: data.role,
                        location: data.location,
                    })
                );

                if (data.location?.city && data.location?.area) {
                    localStorage.setItem(
                        'selectedLocation',
                        JSON.stringify({
                            city: data.location.city,
                            area: data.location.area,
                        })
                    );
                }

                window.dispatchEvent(new Event('storage'));
                setStep(0);
                showSuccess('Onboarding completed successfully');

                // Reload to reflect new role dashboard
                window.location.reload();
            } catch (error) {
                showError(error.response?.data?.message || 'Failed to complete onboarding');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Guest user skipping auth onboarding
            localStorage.setItem('onboarding_complete', 'true');
            if (city || area) {
                localStorage.setItem('user_city', city);
                localStorage.setItem('user_area', area);
            }
            window.dispatchEvent(new Event('storage'));
            setStep(0);
        }
    };

    if (step === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/60 p-4 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-md overflow-hidden rounded-2xl bg-light shadow-2xl"
                >
                    {step === 1 && (
                        <div className="p-8 text-center">
                            <h2 className="mb-6 text-2xl font-bold text-dark">{t('select_language') || 'Language'}</h2>
                            <p className="mb-8 text-app-muted">Choose your preferred language / अपनी पसंदीदा भाषा चुनें</p>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => handleLanguageSelect('en')}
                                    className="flex items-center justify-center rounded-xl bg-primary px-6 py-4 font-semibold text-white transition-transform hover:scale-105 active:scale-95"
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => handleLanguageSelect('hi')}
                                    className="flex items-center justify-center rounded-xl bg-primary px-6 py-4 font-semibold text-white transition-transform hover:scale-105 active:scale-95"
                                >
                                    हिन्दी (Hindi)
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-8 text-center">
                            <h2 className="mb-6 text-2xl font-bold text-dark">What are you here for?</h2>
                            <p className="mb-8 text-app-muted">Select your primary reason for using our platform.</p>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => handleRoleSelect('user')}
                                    className="flex items-center justify-center rounded-xl bg-white border border-gray-200 px-6 py-4 font-semibold text-dark transition-transform hover:scale-105 active:scale-95 hover:border-primary hover:text-primary"
                                >
                                    I am a Customer
                                </button>
                                <button
                                    onClick={() => handleRoleSelect('shop_owner')}
                                    className="flex items-center justify-center rounded-xl bg-white border border-gray-200 px-6 py-4 font-semibold text-dark transition-transform hover:scale-105 active:scale-95 hover:border-primary hover:text-primary"
                                >
                                    I am a Shop Owner
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-8 text-center">
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                                <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>

                            <h2 className="mb-4 text-2xl font-bold text-dark">{t('location_permission') || 'Where are you?'}</h2>
                            <p className="mb-6 text-app-muted">{t('location_desc') || 'Detecting your location helps us show relevant products and shops near you.'}</p>

                            <div className="flex flex-col gap-4 text-left">
                                <button
                                    onClick={handleLocationDetect}
                                    disabled={loadingLoc}
                                    className="flex w-full items-center justify-center rounded-xl bg-primary/10 px-4 py-3 font-semibold text-primary transition-transform hover:bg-primary/20 active:scale-95 disabled:opacity-70"
                                >
                                    {loadingLoc ? 'Detecting...' : 'Auto-detect Location'}
                                </button>

                                <div className="mt-2 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">City</label>
                                        <SuggestionInput
                                            value={city}
                                            options={cityOptions}
                                            onChange={setCity}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary"
                                            placeholder="Enter city"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Area</label>
                                        <SuggestionInput
                                            value={area}
                                            options={areaOptions}
                                            onChange={setArea}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-primary"
                                            placeholder="Enter area"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={completeOnboarding}
                                    disabled={isSubmitting || loadingLoc}
                                    className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Saving...' : 'Complete Profile'}
                                </button>

                                {!Boolean(localStorage.getItem('authToken')) && (
                                    <button
                                        onClick={completeOnboarding}
                                        disabled={isSubmitting}
                                        className="mt-2 text-sm font-medium text-center text-app-muted hover:text-dark disabled:opacity-50"
                                    >
                                        {t('skip') || 'Skip'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OnboardingOverlay;
