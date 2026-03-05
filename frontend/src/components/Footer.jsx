import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="mt-8 border-t border-gray-200 bg-white py-5 text-gray-600">
            <div className="container mx-auto flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
                <h2 className="text-lg font-black tracking-tight text-dark">
                    MOHITO<span className="text-primary">MART</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                    <Link to="/" className="transition hover:text-primary">
                        {t('home') || 'Home'}
                    </Link>
                    <Link to="/services/all" className="transition hover:text-primary">
                        {t('services') || 'Services'}
                    </Link>
                    <Link to="/profile" className="transition hover:text-primary">
                        {t('profile') || 'Profile'}
                    </Link>
                    <Link to="/about-us" className="transition hover:text-primary">
                        {t('about_us') || 'About Us'}
                    </Link>
                    <Link to="/terms-and-conditions" className="transition hover:text-primary">
                        {t('terms_and_conditions') || 'Terms'}
                    </Link>
                    <Link to="/privacy-policy" className="transition hover:text-primary">
                        {t('privacy_policy') || 'Privacy'}
                    </Link>
                    <Link to="/contact-us" className="transition hover:text-primary">
                        {t('contact_us') || 'Contact'}
                    </Link>
                </div>
            </div>
            <div className="container mx-auto border-t border-gray-100 px-4 pt-3 text-xs text-gray-500 md:px-8">
                &copy; {new Date().getFullYear()} Mohito Mart. {t('all_rights_reserved') || 'All Rights Reserved.'}
            </div>
        </footer>
    );
};

export default Footer;
