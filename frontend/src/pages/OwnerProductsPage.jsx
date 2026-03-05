import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { useFlash } from '../context/FlashContext';
import { formatProductPrice } from '../utils/productPrice';
import ConfirmDialog from '../components/ConfirmDialog';

const OwnerProductsPage = () => {
    const navigate = useNavigate();
    const { showError, showSuccess } = useFlash();
    const [loading, setLoading] = useState(true);
    const [profileRole, setProfileRole] = useState('user');
    const [shops, setShops] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedShopId, setSelectedShopId] = useState('');
    const [deletingProductId, setDeletingProductId] = useState('');
    const [productIdToDelete, setProductIdToDelete] = useState('');

    const canManageItems = useMemo(
        () => ['shop_owner', 'admin'].includes(profileRole),
        [profileRole]
    );

    const selectedShop = useMemo(
        () => shops.find((shop) => shop._id === selectedShopId) || null,
        [shops, selectedShopId]
    );
    const productToDelete = useMemo(
        () => products.find((product) => product._id === productIdToDelete) || null,
        [products, productIdToDelete]
    );

    const fetchProductsForShop = async (shopId) => {
        if (!shopId) {
            setProducts([]);
            return;
        }

        try {
            const { data } = await api.get('/products/me/list', {
                params: {
                    shopId,
                },
            });
            setProducts(data.products || []);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load products'));
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
                await fetchProductsForShop(defaultShopId);
            } else {
                setProducts([]);
            }
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load owner products page'));
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
        fetchProductsForShop(shopId);
    };

    const requestDeleteProduct = (productId) => {
        setProductIdToDelete(productId);
    };

    const deleteProduct = async () => {
        if (!productIdToDelete) {
            return;
        }

        try {
            setDeletingProductId(productIdToDelete);
            await api.delete(`/products/${productIdToDelete}`);
            showSuccess('Product deleted');
            await fetchProductsForShop(selectedShopId);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to delete product'));
        } finally {
            setDeletingProductId('');
            setProductIdToDelete('');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">Loading owner products...</p>
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
                    <h1 className="text-3xl text-base font-black text-dark sm:text-4xl">Manage all products</h1>
                </div>
            </div>

            {shops.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
                    <p className="text-gray-600">Create your shop profile first, then you can add items.</p>
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
                                <h2 className="text-2xl font-black text-dark">Items List</h2>
                            </div>
                            <Link
                                to="/owner/products/new"
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                            >
                                Add New
                            </Link>
                        </div>

                        {products.length === 0 && (
                            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                                No products have been added to this shop yet.
                            </p>
                        )}

                        {products.length > 0 && (
                            <div className="space-y-3">
                                {products.map((product) => (
                                    <div
                                        key={product._id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={product.images?.[0]}
                                                alt={product.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-16 w-16 rounded-lg object-cover sm:h-20 sm:w-20"
                                            />
                                            <div>
                                                <p className="font-semibold text-dark">{product.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatProductPrice(product)} | {product.category}
                                                </p>
                                                <p className="text-xs font-medium text-gray-500">
                                                    {product.viewsCount || 0} views
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/owner/products/${product._id}/edit`}
                                                className="rounded-lg border border-primary/30 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => requestDeleteProduct(product._id)}
                                                disabled={deletingProductId === product._id}
                                                className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                                            >
                                                {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
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
                open={Boolean(productIdToDelete)}
                title="Delete Product?"
                message={`Do you really want to delete "${productToDelete?.name || 'this product'}"?`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={deleteProduct}
                onCancel={() => {
                    if (!deletingProductId) {
                        setProductIdToDelete('');
                    }
                }}
                loading={deletingProductId === productIdToDelete}
                danger
            />
        </div>
    );
};

export default OwnerProductsPage;
