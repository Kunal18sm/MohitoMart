import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './redux/store.js';
import './index.css';
import App from './App.jsx';
import { FlashProvider } from './context/FlashContext.jsx';

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
