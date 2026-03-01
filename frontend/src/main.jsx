import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './redux/store.js';
import './index.css';
import App from './App.jsx';
import { FlashProvider } from './context/FlashContext.jsx';

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator && (import.meta.env.PROD || isLocalhost)) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
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
