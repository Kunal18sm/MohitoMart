import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="mt-8 border-t border-gray-200 bg-white py-5 text-gray-600">
            <div className="container mx-auto flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
                <h2 className="text-lg font-black tracking-tight text-dark">
                    MOHITO<span className="text-primary">MART</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                    <Link to="/" className="transition hover:text-primary">
                        Home
                    </Link>
                    <Link to="/services/all" className="transition hover:text-primary">
                        Services
                    </Link>
                    <Link to="/profile" className="transition hover:text-primary">
                        Profile
                    </Link>
                </div>
            </div>
            <div className="container mx-auto border-t border-gray-100 px-4 pt-3 text-xs text-gray-500 md:px-8">
                &copy; {new Date().getFullYear()} Mohito Mart. All Rights Reserved.
            </div>
        </footer>
    );
};

export default Footer;
