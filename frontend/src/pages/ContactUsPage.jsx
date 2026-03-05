import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'support@mohitomart.com';
const CONTACT_PHONE = '+91 90000 00000';

const ContactUsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('support') || 'Support'}</p>
                <h1 className="mt-2 text-3xl font-black text-dark sm:text-4xl">{t('contact_us') || 'Contact Us'}</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                    {t('contact_us_intro') || 'Contact us for account, listing, payment, or general platform queries. Our team responds within working hours.'}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-light p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('email') || 'Email'}</p>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="mt-1 block text-sm font-bold text-primary hover:underline"
                        >
                            {CONTACT_EMAIL}
                        </a>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-light p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('phone') || 'Phone'}</p>
                        <a
                            href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}
                            className="mt-1 block text-sm font-bold text-primary hover:underline"
                        >
                            {CONTACT_PHONE}
                        </a>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-light p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('working_hours') || 'Working Hours'}</p>
                        <p className="mt-1 text-sm font-bold text-dark">{t('working_hours_value') || 'Mon-Sat, 10:00 AM - 7:00 PM IST'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUsPage;
