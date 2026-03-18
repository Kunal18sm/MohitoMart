export const THEME_STORAGE_KEY = 'mohito_theme';
export const LIGHT_THEME = 'light';
export const DARK_THEME = 'dark';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export const getSystemTheme = () => {
    if (!isBrowser() || typeof window.matchMedia !== 'function') {
        return LIGHT_THEME;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
};

export const resolveTheme = () => {
    if (!isBrowser()) {
        return LIGHT_THEME;
    }

    const storedTheme = String(localStorage.getItem(THEME_STORAGE_KEY) || '').trim().toLowerCase();
    if (storedTheme === DARK_THEME || storedTheme === LIGHT_THEME) {
        return storedTheme;
    }

    return getSystemTheme();
};

export const getActiveTheme = () => {
    if (!isBrowser()) {
        return LIGHT_THEME;
    }

    return document.documentElement.classList.contains(DARK_THEME) ? DARK_THEME : LIGHT_THEME;
};

export const applyTheme = (theme, { persist = true, emit = true } = {}) => {
    if (!isBrowser()) {
        return LIGHT_THEME;
    }

    const normalizedTheme = theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
    const isDarkTheme = normalizedTheme === DARK_THEME;
    const rootElement = document.documentElement;

    rootElement.classList.toggle(DARK_THEME, isDarkTheme);
    rootElement.style.colorScheme = isDarkTheme ? DARK_THEME : LIGHT_THEME;

    if (persist) {
        localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    }

    if (emit) {
        window.dispatchEvent(
            new CustomEvent('app:theme-changed', {
                detail: { theme: normalizedTheme },
            })
        );
    }

    return normalizedTheme;
};

export const initializeTheme = () => applyTheme(resolveTheme(), { persist: false, emit: false });

export const toggleTheme = () =>
    applyTheme(getActiveTheme() === DARK_THEME ? LIGHT_THEME : DARK_THEME);
