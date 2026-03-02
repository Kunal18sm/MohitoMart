import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';
import { detectDeviceLocation } from '../utils/deviceLocation';
import { GoogleLogin } from '@react-oauth/google';
import SuggestionInput from '../components/SuggestionInput';

const getRedirectPathByRole = (role) => {
    if (role === 'admin') {
        return '/admin';
    }

    if (role === 'shop_owner') {
        return '/owner/shop';
    }

    return '/';
};

const hasValidLocation = (location) => {
    const city = String(location?.city || '').trim();
    const area = String(location?.area || '').trim();
    return Boolean(city && area);
};

const resolveOnboardingComplete = (payload = {}) => {
    if (payload.role && payload.role !== 'user') {
        return true;
    }

    const hasProfileLocation = hasValidLocation(payload.location);
    if (typeof payload.onboardingCompleted === 'boolean') {
        return payload.onboardingCompleted || hasProfileLocation;
    }

    return hasProfileLocation;
};

const AuthPage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [mode, setMode] = useState('login');
    const [loading, setLoading] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [error, setError] = useState('');
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();

    const [loginData, setLoginData] = useState({
        identifier: '',
        password: '',
    });

    const [registerData, setRegisterData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        city: '',
        area: '',
        role: 'user',
    });

    const areaOptions = useMemo(
        () => getAreaOptionsByCity(registerData.city),
        [getAreaOptionsByCity, registerData.city]
    );

    useEffect(() => {
        const hasSession = Boolean(localStorage.getItem('authToken'));
        if (!hasSession) {
            return;
        }

        let storedProfile = {};
        try {
            storedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        } catch (error) {
            storedProfile = {};
        }
        navigate(getRedirectPathByRole(storedProfile.role), { replace: true });
    }, [navigate]);

    useEffect(() => {
        if (mode !== 'register') {
            return;
        }

        let storedLocation = {};
        try {
            storedLocation = JSON.parse(localStorage.getItem('selectedLocation') || '{}');
        } catch (parseError) {
            storedLocation = {};
        }
        const city = String(storedLocation.city || localStorage.getItem('user_city') || '').trim();
        const area = String(storedLocation.area || localStorage.getItem('user_area') || '').trim();

        if (!city || !area) {
            return;
        }

        setRegisterData((previous) => ({
            ...previous,
            city: previous.city || city,
            area: previous.area || area,
        }));
    }, [mode]);

    const persistAuth = (payload) => {
        localStorage.setItem('authToken', 'session');

        const onboardingCompleted = resolveOnboardingComplete(payload);
        localStorage.setItem('onboarding_complete', onboardingCompleted ? 'true' : 'false');

        if (payload.locationPermissionGranted) {
            localStorage.setItem('location_permission_granted', 'true');
        } else {
            localStorage.removeItem('location_permission_granted');
        }

        localStorage.setItem(
            'userProfile',
            JSON.stringify({
                id: payload._id,
                name: payload.name,
                email: payload.email,
                role: payload.role,
                location: payload.location,
            })
        );

        if (payload.location?.city && payload.location?.area) {
            localStorage.setItem(
                'selectedLocation',
                JSON.stringify({
                    city: payload.location.city,
                    area: payload.location.area,
                })
            );
        }

        window.dispatchEvent(new Event('storage'));
    };

    const persistGuestLocation = ({ city, area, latitude, longitude }) => {
        localStorage.setItem('user_city', city);
        localStorage.setItem('user_area', area);
        localStorage.setItem('user_lat', String(latitude));
        localStorage.setItem('user_lon', String(longitude));
        localStorage.setItem(
            'selectedLocation',
            JSON.stringify({
                city,
                area,
            })
        );
        window.dispatchEvent(new Event('storage'));
    };

    const autofillLocationFromDevice = async () => {
        try {
            setDetectingLocation(true);
            const detected = await detectDeviceLocation({ timeoutMs: 15000 });
            setRegisterData((previous) => ({
                ...previous,
                city: detected.city,
                area: detected.area,
            }));
            persistGuestLocation(detected);
            if (detected.isApproximate) {
                showSuccess(
                    `Approximate location: ${detected.area}, ${detected.city}. Please verify area.`
                );
            } else {
                showSuccess(`Location detected: ${detected.area}, ${detected.city}`);
            }
        } catch (err) {
            const message = extractErrorMessage(err, 'Unable to detect your location');
            setError(message);
            showError(message);
        } finally {
            setDetectingLocation(false);
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();

        if (!loginData.identifier.trim() || !loginData.password.trim()) {
            const message = 'Username/Email and password are required';
            setError(message);
            showError(message);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const { data } = await api.post('/auth/login', {
                identifier: loginData.identifier.trim(),
                password: loginData.password,
            });
            persistAuth(data);
            showSuccess('Login successful');
            navigate(getRedirectPathByRole(data.role), { replace: true });
        } catch (err) {
            setError(extractErrorMessage(err, 'Login failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.post('/auth/google', {
                credential: credentialResponse.credential
            });
            persistAuth(data);
            showSuccess('Google Login successful');
            navigate(getRedirectPathByRole(data.role), { replace: true });
        } catch (err) {
            setError(extractErrorMessage(err, 'Google authentication failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        const msg = 'Google authentication failed. Please try again.';
        setError(msg);
        showError(msg);
    };

    const handleRegister = async (event) => {
        event.preventDefault();

        const payload = {
            name: registerData.name.trim(),
            username: registerData.username.trim(),
            email: registerData.email.trim(),
            password: registerData.password,
            city: registerData.city.trim(),
            area: registerData.area.trim(),
            role: registerData.role,
        };

        if (!payload.name || !payload.username || !payload.email || !payload.password || !payload.city || !payload.area) {
            const message = 'Name, username, email, password, city and area are required';
            setError(message);
            showError(message);
            return;
        }

        if (payload.password.length < 6) {
            const message = 'Password must be at least 6 characters';
            setError(message);
            showError(message);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const { data } = await api.post('/auth/register', payload);
            persistAuth(data);
            showSuccess('Registration successful');
            navigate(getRedirectPathByRole(data.role), { replace: true });
        } catch (err) {
            setError(extractErrorMessage(err, 'Registration failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-6 flex gap-3">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-dark text-white' : 'bg-light text-gray-600'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold ${mode === 'register' ? 'bg-dark text-white' : 'bg-light text-gray-600'
                            }`}
                    >
                        Signup
                    </button>
                </div>

                {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <h1 className="text-2xl font-black text-dark sm:text-3xl">Login</h1>

                        <input
                            type="text"
                            placeholder="Email or Username"
                            value={loginData.identifier}
                            onChange={(event) =>
                                setLoginData((prev) => ({ ...prev, identifier: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={loginData.password}
                            onChange={(event) =>
                                setLoginData((prev) => ({ ...prev, password: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50"
                        >
                            {loading ? 'Please wait...' : 'Login'}
                        </button>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="shrink-0 px-4 text-sm text-gray-500">Or continue with</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                useOneTap
                            />
                        </div>
                    </form>
                )}

                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <h1 className="text-2xl font-black text-dark sm:text-3xl">Create Account</h1>

                        <button
                            type="button"
                            onClick={autofillLocationFromDevice}
                            disabled={detectingLocation}
                            className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                        >
                            {detectingLocation ? 'Detecting location...' : 'Use my current location'}
                        </button>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={registerData.name}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                            type="text"
                            placeholder="Username"
                            value={registerData.username}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, username: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={registerData.email}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, email: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={registerData.password}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, password: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                            <SuggestionInput
                                value={registerData.city}
                                placeholder="City"
                                options={cityOptions}
                                onChange={(nextValue) =>
                                    setRegisterData((prev) => ({ ...prev, city: nextValue }))
                                }
                                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                            />
                            <SuggestionInput
                                value={registerData.area}
                                placeholder="Area"
                                options={areaOptions}
                                onChange={(nextValue) =>
                                    setRegisterData((prev) => ({ ...prev, area: nextValue }))
                                }
                                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                            />
                        </div>
                        <select
                            value={registerData.role}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, role: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                        >
                            <option value="user">I am a customer</option>
                            <option value="shop_owner">I am a shop owner</option>
                        </select>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50"
                        >
                            {loading ? 'Please wait...' : 'Signup'}
                        </button>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="shrink-0 px-4 text-sm text-gray-500">Or continue with</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                useOneTap
                            />
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthPage;
