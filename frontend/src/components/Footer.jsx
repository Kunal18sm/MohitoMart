import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="mt-14 border-t border-gray-200 bg-gradient-to-b from-white to-slate-50 py-12 text-gray-600">
            <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-4 md:px-8">
                <div>
                    <h2 className="mb-4 text-2xl font-black tracking-tighter text-dark">
                        MOHITO<span className="text-primary">MART</span>
                    </h2>
                    <p className="mb-6 text-sm text-gray-500">
                        Apne area ki trusted shops discover karo, products compare karo, aur direct shop se connect
                        karo.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold">
                            Local First
                        </span>
                        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold">
                            Nearby Search
                        </span>
                    </div>
                </div>

                <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-dark">Platform</h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <Link to="/" className="transition hover:text-primary">
                                Discover Shops
                            </Link>
                        </li>
                        <li>
                            <Link to="/profile" className="transition hover:text-primary">
                                Followed Shops
                            </Link>
                        </li>
                        <li>
                            <Link to="/auth" className="transition hover:text-primary">
                                Shop Owner Signup
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-dark">Categories</h3>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <Link to="/category/electronics" className="transition hover:text-primary">
                                Electronics
                            </Link>
                        </li>
                        <li>
                            <Link to="/category/toys" className="transition hover:text-primary">
                                Toys
                            </Link>
                        </li>
                        <li>
                            <Link to="/category/furniture" className="transition hover:text-primary">
                                Furniture
                            </Link>
                        </li>
                        <li>
                            <Link to="/category/clothing" className="transition hover:text-primary">
                                Clothing
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-dark">For Shop Owners</h3>
                    <p className="text-sm text-gray-500">
                        Shop profile maintain karo, product insights dekho, aur customers tak fast reach karo.
                    </p>
                </div>
            </div>
            <div className="container mx-auto mt-12 border-t border-gray-200 px-4 pt-8 text-center text-sm text-gray-500 md:px-8">
                &copy; {new Date().getFullYear()} Mohito Mart. All Rights Reserved.
            </div>
        </footer>
    );
};

export default Footer;
