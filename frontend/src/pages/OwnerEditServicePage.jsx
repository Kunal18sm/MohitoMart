import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { uploadImages, validateImageFiles } from '../utils/uploadUtils';

const OwnerEditServicePage = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileRole, setProfileRole] = useState('user');
    const [service, setService] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [form, setForm] = useState({
        name: '',
        priceMin: '',
        priceMax: '',
        description: '',
    });

    const canManageItems = useMemo(
        () => ['shop_owner', 'admin'].includes(profileRole),
        [profileRole]
    );

    useEffect(
        () => () => {
            previewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        },
        [previewUrls]
    );

    const loadService = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const [profileRes, serviceRes] = await Promise.all([
                api.get('/users/profile'),
                api.get(`/services/${serviceId}`),
            ]);

            setProfileRole(profileRes.data.role);

            if (!['shop_owner', 'admin'].includes(profileRes.data.role)) {
                showError('Only shop owners can edit service listings');
                navigate('/profile', { replace: true });
                return;
            }

            const matchedService = serviceRes.data || null;
            if (!matchedService?._id) {
                showError('Service not found');
                navigate('/owner/services');
                return;
            }

            setService(matchedService);
            setForm({
                name: matchedService.name || '',
                priceMin: String(matchedService.priceMin ?? matchedService.price ?? ''),
                priceMax: String(matchedService.priceMax ?? matchedService.price ?? ''),
                description: matchedService.description || '',
            });
            setPreviewUrls(matchedService.images || []);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load service for edit'));
            navigate('/owner/services');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadService();
    }, [serviceId]);

    const handleFileSelection = (event) => {
        try {
            const files = validateImageFiles(event.target.files, { min: 1, max: 5, maxSizeMB: 5 });

            previewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });

            setSelectedFiles(files);
            setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
        } catch (error) {
            showError(extractErrorMessage(error));
            event.target.value = '';
        }
    };

    const updateService = async (event) => {
        event.preventDefault();

        if (!form.name.trim() || form.priceMin === '' || form.priceMax === '') {
            showError('Service name and price range are required');
            return;
        }

        const priceMin = Number(form.priceMin);
        const priceMax = Number(form.priceMax);

        if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < 0) {
            showError('Please enter a valid non-negative price range');
            return;
        }

        if (priceMax < priceMin) {
            showError('Max price should be greater than or equal to min price');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name: form.name.trim(),
                priceMin,
                priceMax,
                description: form.description.trim(),
            };

            if (selectedFiles.length > 0) {
                setUploading(true);
                const uploadedImageUrls = await uploadImages(selectedFiles, 'mohito-mart/services');
                payload.images = uploadedImageUrls;
                setUploading(false);
            }

            await api.put(`/services/${serviceId}`, payload);
            showSuccess('Service updated successfully');
            navigate('/owner/services');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to update service'));
        } finally {
            setUploading(false);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading service editor...</p>
            </div>
        );
    }

    if (!canManageItems || !service) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Only shop owners can edit service listings.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">Edit Service</h1>
                    <p className="text-sm text-gray-500">
                        Shop: {service.shop?.name || '-'} | Category: {service.category}
                    </p>
                </div>
                <Link
                    to="/owner/services"
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    Back to Services
                </Link>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <form onSubmit={updateService} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Service Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Service name"
                            value={form.name}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, name: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Price Min (Rs) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Min price"
                            value={form.priceMin}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, priceMin: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Price Max (Rs) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Max price"
                            value={form.priceMax}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, priceMax: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Description
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Description"
                            value={form.description}
                            onChange={(event) =>
                                setForm((previous) => ({ ...previous, description: event.target.value }))
                            }
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Replace Images (1 to 5)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelection}
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
                        />
                        {(uploading || saving) && (
                            <p className="mt-2 text-sm text-gray-500">
                                {uploading ? 'Uploading images...' : 'Saving service...'}
                            </p>
                        )}
                    </div>

                    {previewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-5">
                            {previewUrls.map((url, index) => (
                                <AdaptiveCardImage
                                    key={`${url}-${index}`}
                                    source={url}
                                    alt={`preview-${index + 1}`}
                                    kind="service"
                                    containerClassName="h-24 rounded-lg border border-gray-200 bg-white"
                                    fillContainer
                                />
                            ))}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading || saving}
                        className="rounded-lg bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50 md:col-span-2"
                    >
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OwnerEditServicePage;
