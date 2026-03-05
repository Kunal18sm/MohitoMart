import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import hiTranslation from './locales/hi.json';

const resources = {
    en: {
        translation: enTranslation,
    },
    hi: {
        translation: hiTranslation,
    },
};

const savedLanguage = localStorage.getItem('app_language') || 'en';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: savedLanguage,
        fallbackLng: 'en',
        returnNull: false,
        returnEmptyString: false,
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
