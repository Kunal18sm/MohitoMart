import { Link } from 'react-router-dom';

const CartPage = () => {
    // Dummy cart items
    const cartItems = [
        {
            product: '1',
            name: 'Sony WH-1000XM4 Noise Canceling Headphones',
            image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            price: 299.99,
            qty: 1,
            countInStock: 5,
        },
        {
            product: '4',
            name: 'Nike Air Max 270',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
            price: 150.00,
            qty: 2,
            countInStock: 8,
        }
    ];

    const subtotal = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-black text-dark tracking-tight mb-8">Shopping Cart</h1>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Cart Items List */}
                <div className="w-full lg:w-2/3">
                    {cartItems.length === 0 ? (
                        <div className="bg-light p-8 rounded-2xl text-center">
                            <p className="text-xl text-gray-500 mb-4">Your cart is empty.</p>
                            <Link to="/" className="text-primary font-bold hover:underline">Go Shopping</Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {cartItems.map((item) => (
                                <div key={item.product} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-primary/20 transition-colors">
                                    <div className="w-32 h-32 rounded-2xl overflow-hidden bg-light shrink-0">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                                    </div>

                                    <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between w-full">
                                        <div className="mb-4 md:mb-0 max-w-sm">
                                            <Link to={`/product/${item.product}`} className="text-lg font-bold text-dark hover:text-primary transition-colors line-clamp-2 leading-tight mb-1">
                                                {item.name}
                                            </Link>
                                            <p className="text-gray-500 font-medium">${item.price.toFixed(2)}</p>
                                        </div>

                                        <div className="flex items-center gap-6 md:gap-8">
                                            <div className="flex items-center bg-light justify-between w-28 rounded-full border border-gray-200 p-1">
                                                <button className="w-8 h-8 rounded-full bg-white text-dark shadow-sm font-black hover:text-primary">-</button>
                                                <span className="font-bold">{item.qty}</span>
                                                <button className="w-8 h-8 rounded-full bg-white text-dark shadow-sm font-black hover:text-primary">+</button>
                                            </div>

                                            <div className="text-xl font-black text-dark w-24 text-right">
                                                ${(item.price * item.qty).toFixed(2)}
                                            </div>

                                            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-secondary hover:bg-secondary hover:text-white transition-colors flex-shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Order Summary */}
                <div className="w-full lg:w-1/3">
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-dark/5 sticky top-28">
                        <h2 className="text-2xl font-black text-dark mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6 border-b border-gray-100 pb-6 text-lg text-gray-600">
                            <div className="flex justify-between">
                                <span>Subtotal ({cartItems.reduce((a, c) => a + c.qty, 0)} items)</span>
                                <span className="font-bold text-dark">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span className="font-bold text-dark">{subtotal > 100 ? 'Free' : '$10.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax (8%)</span>
                                <span className="font-bold text-dark">${(subtotal * 0.08).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-2xl font-black text-dark mb-8">
                            <span>Total</span>
                            <span className="text-primary">${(subtotal + (subtotal > 100 ? 0 : 10) + (subtotal * 0.08)).toFixed(2)}</span>
                        </div>

                        <button
                            disabled={cartItems.length === 0}
                            className="w-full bg-dark hover:bg-primary-dark text-white py-4 rounded-xl font-bold text-xl shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                            Proceed to Checkout
                        </button>
                        <div className="mt-4 text-center">
                            <Link to="/" className="text-primary font-semibold hover:underline">Continue Shopping</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
