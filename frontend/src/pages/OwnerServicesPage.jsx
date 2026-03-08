import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { formatServicePrice } from '../utils/servicePrice';
import ConfirmDialog from '../components/ConfirmDialog';

const OwnerServicesPage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [profileRole, setProfileRole] = useState('user');
    const [shops, setShops] = useState([]);
    const [services, setServices] = useState([]);
    const [servicesSummary, setServicesSummary] = useState({
        totalServices: 0,
        totalViews: 0,
    });
    const [selectedShopId, setSelectedShopId] = useState('');
    const [deletingServiceId, setDeletingServiceId] = useState('');
    const [serviceIdToDelete, setServiceIdToDelete] = useState('');

    const canManageItems = useMemo(
        () => ['shop_owner', 'admin'].includes(profileRole),
        [profileRole]
    );

    const selectedShop = useMemo(
        () => shops.find((shop) => shop._id === selectedShopId) || null,
        [shops, selectedShopId]
    );
    const serviceToDelete = useMemo(
        () => services.find((service) => service._id === serviceIdToDelete) || null,
        [services, serviceIdToDelete]
    );

    const fetchServicesForShop = async (shopId) => {
        if (!shopId) {
            setServices([]);
            return;
        }

        try {
            const { data } = await api.get('/services/me/list', {
                params: {
                    shopId,
                },
            });
            setServices(data.services || []);
            setServicesSummary({
                totalServices: Number(data.summary?.totalServices || 0),
                totalViews: Number(data.summary?.totalViews || 0),
            });
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load services'));
        }
    };

    const loadPageData = async () => {
        if (!localStorage.getItem('authToken')) {
            navigate('/auth');
            return;
        }

        try {
            setLoading(true);
            const [profileRes, shopsRes] = await Promise.all([
                api.get('/users/profile'),
                api.get('/shops/me/owned'),
            ]);

            setProfileRole(profileRes.data.role);
            const ownedShops = shopsRes.data.shops || [];
            setShops(ownedShops);

            const defaultShopId = ownedShops?.[0]?._id || '';
            setSelectedShopId(defaultShopId);

            if (defaultShopId) {
                await fetchServicesForShop(defaultShopId);
            } else {
                setServices([]);
                setServicesSummary({
                    totalServices: 0,
                    totalViews: 0,
                });
            }
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load owner services page'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPageData();
    }, []);

    const handleShopChange = (event) => {
        const shopId = event.target.value;
        setSelectedShopId(shopId);
        fetchServicesForShop(shopId);
    };

    const requestDeleteService = (serviceId) => {
        setServiceIdToDelete(serviceId);
    };

    const deleteService = async () => {
        if (!serviceIdToDelete) {
            return;
        }

        try {
            setDeletingServiceId(serviceIdToDelete);
            await api.delete(`/services/${serviceIdToDelete}`);
            showSuccess('Service deleted');
            await fetchServicesForShop(selectedShopId);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to delete service'));
        } finally {
            setDeletingServiceId('');
            setServiceIdToDelete('');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading owner services...</p>
            </div>
        );
    }

    if (!canManageItems) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    Only shop owners can access this page.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-dark sm:text-4xl">Services Manager</h1>
                    <p className="text-sm text-gray-500">Manage your service pricing and details here.</p>
                </div>
            </div>

            {shops.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
                    <p className="text-gray-600">Create your shop profile first, then you can add services.</p>
                    <Link
                        to="/owner/shop"
                        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                        Create Shop Profile
                    </Link>
                </div>
            )}

            {shops.length > 0 && (
                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-black text-dark">Service List</h2>
                                <p className="text-sm text-gray-500">
                                    {servicesSummary.totalServices} services | {servicesSummary.totalViews} total views
                                </p>
                            </div>
                            <Link
                                to="/owner/services/new"
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                            >
                                Add Service
                            </Link>
                        </div>

                        {services.length === 0 && (
                            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                                No services have been added to this shop yet.
                            </p>
                        )}

                        {services.length > 0 && (
                            <div className="space-y-3">
                                {services.map((service) => (
                                    <div
                                        key={service._id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 overflow-hidden rounded-lg bg-white">
                                                <AdaptiveCardImage
                                                    source={service.images?.[0]}
                                                    alt={service.name}
                                                    kind="service"
                                                    containerClassName="h-12"
                                                    fillContainer
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-dark">{service.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatServicePrice(service)} | {service.category}
                                                </p>
                                                <p className="text-xs font-medium text-gray-500">
                                                    {service.viewsCount || 0} views
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/owner/services/${service._id}/edit`}
                                                className="rounded-lg border border-primary/30 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => requestDeleteService(service._id)}
                                                disabled={deletingServiceId === service._id}
                                                className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                                            >
                                                {deletingServiceId === service._id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(serviceIdToDelete)}
                title="Delete Service?"
                message={`Do you really want to delete "${serviceToDelete?.name || 'this service'}"?`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={deleteService}
                onCancel={() => {
                    if (!deletingServiceId) {
                        setServiceIdToDelete('');
                    }
                }}
                loading={deletingServiceId === serviceIdToDelete}
                danger
            />
        </div>
    );
};

export default OwnerServicesPage;
