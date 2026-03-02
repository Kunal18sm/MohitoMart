import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './redux/store.js';
import './index.css';
import './i18n';
import App from './App.jsx';
import { FlashProvider } from './context/FlashContext.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator && (import.meta.env.PROD || isLocalhost)) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => { });
    });
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '406817513870-g70h24bmi8216l6i1kpibd7nodgd9lhh.apps.googleusercontent.com'}>
            <Provider store={store}>
                <FlashProvider>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </FlashProvider>
            </Provider>
        </GoogleOAuthProvider>
    </StrictMode>,
)
