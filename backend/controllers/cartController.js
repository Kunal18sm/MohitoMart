import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const MAX_CART_ITEM_QTY = 99;

const normalizeQty = (value, fallback = 1) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    const rounded = Math.floor(numeric);
    if (rounded < 1) {
        return 1;
    }

    return Math.min(rounded, MAX_CART_ITEM_QTY);
};

const summarizeCartItems = (items = []) => {
    const normalizedItems = items.map((item) => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);

        return {
            ...item,
            qty,
            price,
            subtotal: qty * price,
        };
    });

    return {
        items: normalizedItems,
        totalItems: normalizedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        totalAmount: normalizedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    };
};

const getCartDocument = async (userId) => {
    const existing = await Cart.findOne({ user: userId });
    if (existing) {
        return existing;
    }

    return Cart.create({
        user: userId,
        cartItems: [],
    });
};

const findCartItemIndex = (cartItems = [], productId) =>
    cartItems.findIndex((item) => String(item.product) === String(productId));

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
export const getMyCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).lean();
        const { items, totalItems, totalAmount } = summarizeCartItems(cart?.cartItems || []);

        res.status(200).json({
            items,
            totalItems,
            totalAmount,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add an item to cart (or increase quantity if already exists)
// @route   POST /api/cart/items
// @access  Private
export const addCartItem = async (req, res, next) => {
    try {
        const { productId, qty } = req.body;
        if (!productId) {
            res.status(400);
            throw new Error('productId is required');
        }

        const product = await Product.findById(productId)
            .select('_id name price images')
            .lean();
        if (!product) {
            res.status(404);
            throw new Error('Product not found');
        }

        const quantity = normalizeQty(qty, 1);
        const cart = await getCartDocument(req.user._id);
        const itemIndex = findCartItemIndex(cart.cartItems, product._id);

        if (itemIndex >= 0) {
            cart.cartItems[itemIndex].qty = normalizeQty(
                Number(cart.cartItems[itemIndex].qty || 0) + quantity,
                1
            );
            cart.cartItems[itemIndex].name = product.name;
            cart.cartItems[itemIndex].price = Number(product.price || 0);
            cart.cartItems[itemIndex].image =
                product.images?.[0] || cart.cartItems[itemIndex].image || '';
        } else {
            cart.cartItems.push({
                product: product._id,
                name: product.name,
                qty: quantity,
                price: Number(product.price || 0),
                image: product.images?.[0] || '',
            });
        }

        await cart.save();
        const { items, totalItems, totalAmount } = summarizeCartItems(cart.cartItems);

        res.status(200).json({
            items,
            totalItems,
            totalAmount,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update quantity of a cart item
// @route   PUT /api/cart/items/:productId
// @access  Private
export const updateCartItemQty = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { qty } = req.body;

        if (qty === undefined) {
            res.status(400);
            throw new Error('qty is required');
        }

        const cart = await getCartDocument(req.user._id);
        const itemIndex = findCartItemIndex(cart.cartItems, productId);

        if (itemIndex === -1) {
            res.status(404);
            throw new Error('Cart item not found');
        }

        const numericQty = Number(qty);
        if (!Number.isFinite(numericQty)) {
            res.status(400);
            throw new Error('qty must be a valid number');
        }

        if (numericQty <= 0) {
            cart.cartItems.splice(itemIndex, 1);
        } else {
            cart.cartItems[itemIndex].qty = normalizeQty(numericQty, 1);
        }

        await cart.save();
        const { items, totalItems, totalAmount } = summarizeCartItems(cart.cartItems);

        res.status(200).json({
            items,
            totalItems,
            totalAmount,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove one item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
export const removeCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const cart = await getCartDocument(req.user._id);

        cart.cartItems = cart.cartItems.filter(
            (item) => String(item.product) !== String(productId)
        );
        await cart.save();

        const { items, totalItems, totalAmount } = summarizeCartItems(cart.cartItems);
        res.status(200).json({
            items,
            totalItems,
            totalAmount,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Clear current user's cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res, next) => {
    try {
        const cart = await getCartDocument(req.user._id);
        cart.cartItems = [];
        await cart.save();

        res.status(200).json({
            items: [],
            totalItems: 0,
            totalAmount: 0,
        });
    } catch (error) {
        next(error);
    }
};
