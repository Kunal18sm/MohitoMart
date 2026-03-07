import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './redux/store.js';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-ext-400.css';
import '@fontsource/plus-jakarta-sans/latin-ext-500.css';
import '@fontsource/plus-jakarta-sans/latin-ext-600.css';
import '@fontsource/plus-jakarta-sans/latin-ext-700.css';
import '@fontsource/plus-jakarta-sans/latin-ext-800.css';
import '@fontsource/sora/latin-600.css';
import '@fontsource/sora/latin-700.css';
import '@fontsource/sora/latin-800.css';
import '@fontsource/sora/latin-ext-600.css';
import '@fontsource/sora/latin-ext-700.css';
import '@fontsource/sora/latin-ext-800.css';
import './index.css';
import './i18n';
import App from './App.jsx';
import { FlashProvider } from './context/FlashContext.jsx';

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator && (import.meta.env.PROD || isLocalhost)) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => { });
    });
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Provider store={store}>
            <FlashProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </FlashProvider>
        </Provider>
    </StrictMode>,
)
