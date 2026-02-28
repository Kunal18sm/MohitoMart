import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { useLocationSuggestions } from '../utils/locationSuggestions';

const getRedirectPathByRole = (role) => {
    if (role === 'admin') {
        return '/admin';
    }

    if (role === 'shop_owner') {
        return '/owner/shop';
    }

    return '/';
};

const AuthPage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [mode, setMode] = useState('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { cityOptions, getAreaOptionsByCity } = useLocationSuggestions();

    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
    });

    const [registerData, setRegisterData] = useState({
        name: '',
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
        const token = localStorage.getItem('authToken');
        if (!token) {
            return;
        }

        const storedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        navigate(getRedirectPathByRole(storedProfile.role), { replace: true });
    }, [navigate]);

    const persistAuth = (payload) => {
        if (payload.token) {
            localStorage.setItem('authToken', payload.token);
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

    const handleLogin = async (event) => {
        event.preventDefault();

        if (!loginData.email.trim() || !loginData.password.trim()) {
            const message = 'Email and password are required';
            setError(message);
            showError(message);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const { data } = await api.post('/auth/login', {
                email: loginData.email.trim(),
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

    const handleRegister = async (event) => {
        event.preventDefault();

        const payload = {
            name: registerData.name.trim(),
            email: registerData.email.trim(),
            password: registerData.password,
            city: registerData.city.trim(),
            area: registerData.area.trim(),
            role: registerData.role,
        };

        if (!payload.name || !payload.email || !payload.password || !payload.city || !payload.area) {
            const message = 'Name, email, password, city and area are required';
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
                        className={`rounded-full px-5 py-2 text-sm font-semibold ${
                            mode === 'login' ? 'bg-dark text-white' : 'bg-light text-gray-600'
                        }`}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold ${
                            mode === 'register' ? 'bg-dark text-white' : 'bg-light text-gray-600'
                        }`}
                    >
                        Signup
                    </button>
                </div>

                {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <h1 className="text-3xl font-black text-dark">Login</h1>
                        <input
                            type="email"
                            placeholder="Email"
                            value={loginData.email}
                            onChange={(event) =>
                                setLoginData((prev) => ({ ...prev, email: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={loginData.password}
                            onChange={(event) =>
                                setLoginData((prev) => ({ ...prev, password: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50"
                        >
                            {loading ? 'Please wait...' : 'Login'}
                        </button>
                    </form>
                )}

                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <h1 className="text-3xl font-black text-dark">Create Account</h1>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={registerData.name}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={registerData.email}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, email: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={registerData.password}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, password: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                            <input
                                type="text"
                                placeholder="City"
                                value={registerData.city}
                                list="auth-city-suggestions"
                                onChange={(event) =>
                                    setRegisterData((prev) => ({ ...prev, city: event.target.value }))
                                }
                                className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                            />
                            <input
                                type="text"
                                placeholder="Area"
                                value={registerData.area}
                                list="auth-area-suggestions"
                                onChange={(event) =>
                                    setRegisterData((prev) => ({ ...prev, area: event.target.value }))
                                }
                                className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                            />
                        </div>
                        <select
                            value={registerData.role}
                            onChange={(event) =>
                                setRegisterData((prev) => ({ ...prev, role: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
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
                        <datalist id="auth-city-suggestions">
                            {cityOptions.map((cityOption) => (
                                <option value={cityOption} key={cityOption} />
                            ))}
                        </datalist>
                        <datalist id="auth-area-suggestions">
                            {areaOptions.map((areaOption) => (
                                <option value={areaOption} key={areaOption} />
                            ))}
                        </datalist>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthPage;
