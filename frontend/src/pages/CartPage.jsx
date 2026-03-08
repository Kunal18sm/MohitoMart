import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdaptiveCardImage from '../components/AdaptiveCardImage';
import api from '../services/api';
import { useFlash } from '../context/FlashContext';
import { extractErrorMessage } from '../utils/errorUtils';
import ConfirmDialog from '../components/ConfirmDialog';

const CartPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showError, showSuccess } = useFlash();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [updatingProductId, setUpdatingProductId] = useState('');
    const [itemIdToRemove, setItemIdToRemove] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const isLoggedIn = Boolean(localStorage.getItem('authToken'));
    const itemToRemove = useMemo(
        () => items.find((entry) => entry.product === itemIdToRemove) || null,
        [items, itemIdToRemove]
    );

    const applyCartResponse = (payload) => {
        setItems(Array.isArray(payload?.items) ? payload.items : []);
    };

    const fetchCart = async () => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.get('/cart');
            applyCartResponse(data);
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to load wishlist'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const requestRemoveItem = (productId) => {
        setItemIdToRemove(productId);
    };

    const removeItem = async () => {
        if (!itemIdToRemove) {
            return;
        }

        try {
            setUpdatingProductId(itemIdToRemove);
            const { data } = await api.delete(`/cart/items/${itemIdToRemove}`);
            applyCartResponse(data);
            showSuccess(t('wishlist_item_removed') || 'Item removed from wishlist');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to remove wishlist item'));
        } finally {
            setUpdatingProductId('');
            setItemIdToRemove('');
        }
    };

    const clearAllItems = async () => {
        try {
            setUpdatingProductId('all');
            const { data } = await api.delete('/cart');
            applyCartResponse(data);
            showSuccess(t('wishlist_cleared') || 'Wishlist cleared');
        } catch (error) {
            showError(extractErrorMessage(error, 'Unable to clear wishlist'));
        } finally {
            setUpdatingProductId('');
            setShowClearConfirm(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="container mx-auto px-4 py-10">
                <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                    <h1 className="text-3xl font-black text-dark">{t('wishlist_title') || 'My Wishlist'}</h1>
                    <p className="mt-3 text-gray-600">
                        {t('login_to_view_wishlist') || 'Please login to view your wishlist items.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/auth')}
                        className="mt-6 rounded-xl bg-dark px-5 py-3 text-sm font-semibold text-white hover:bg-primary"
                    >
                        {t('login_signup') || 'Login / Signup'}
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-10">
                <p className="text-gray-500">{t('loading_wishlist') || 'Loading your wishlist...'}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 md:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-dark sm:text-4xl">
                        {t('wishlist_title') || 'My Wishlist'}
                    </h1>
                    <p className="text-xs text-gray-500">{items.length} {t('items_count') || 'items saved'}</p>
                </div>
                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowClearConfirm(true)}
                        disabled={updatingProductId === 'all'}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                        {updatingProductId === 'all'
                            ? t('clearing') || 'Clearing...'
                            : t('clear_wishlist') || 'Clear Wishlist'}
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                    <p className="mb-4 text-lg text-gray-500">{t('wishlist_empty') || 'Your wishlist is empty.'}</p>
                    <Link to="/" className="font-bold text-primary hover:underline">
                        {t('continue_browsing') || 'Continue browsing'}
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {items.map((item) => (
                        <article
                            key={item.product}
                            className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm"
                        >
                            <Link to={`/product/${item.product}`} className="overflow-hidden rounded-xl bg-light">
                                <AdaptiveCardImage
                                    source={item.image}
                                    alt={item.name}
                                    kind="product"
                                    responsiveOptions={{
                                        width: 360,
                                        widths: [160, 220, 280, 360],
                                        sizes:
                                            '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
                                    }}
                                />
                            </Link>

                            <div className="mt-2 flex flex-1 flex-col gap-2">
                                <Link
                                    to={`/product/${item.product}`}
                                    className="line-clamp-2 text-xs font-semibold leading-tight text-dark hover:text-primary sm:text-sm"
                                >
                                    {item.name}
                                </Link>
                                {Number(item.qty || 1) > 1 && (
                                    <p className="text-[11px] text-gray-500">
                                        {t('saved_qty') || 'Saved quantity'}: {item.qty}
                                    </p>
                                )}
                                <div className="mt-auto flex gap-2">
                                    <Link
                                        to={`/product/${item.product}`}
                                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-[11px] font-semibold text-gray-700 hover:bg-gray-50 sm:text-xs"
                                    >
                                        {t('view') || 'View'}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => requestRemoveItem(item.product)}
                                        disabled={updatingProductId === item.product}
                                        className="flex-1 rounded-lg border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 sm:text-xs"
                                    >
                                        {updatingProductId === item.product
                                            ? t('removing') || 'Removing...'
                                            : t('remove') || 'Remove'}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={Boolean(itemIdToRemove)}
                title="Remove Item?"
                message={`Do you really want to remove "${itemToRemove?.name || 'this item'}" from wishlist?`}
                confirmLabel="Remove"
                cancelLabel="Cancel"
                onConfirm={removeItem}
                onCancel={() => {
                    if (!updatingProductId) {
                        setItemIdToRemove('');
                    }
                }}
                loading={updatingProductId === itemIdToRemove}
                danger={false}
            />

            <ConfirmDialog
                open={showClearConfirm}
                title="Clear Wishlist?"
                message={t('confirm_clear_wishlist') || 'Do you really want to clear your wishlist?'}
                confirmLabel="Clear Wishlist"
                cancelLabel="Cancel"
                onConfirm={clearAllItems}
                onCancel={() => {
                    if (updatingProductId !== 'all') {
                        setShowClearConfirm(false);
                    }
                }}
                loading={updatingProductId === 'all'}
                danger
            />
        </div>
    );
};

export default CartPage;
