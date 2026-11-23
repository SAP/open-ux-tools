import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App.js';
import { Provider } from 'react-redux';
import { actions, store } from './state/index.js';
import { initI18n } from './i18n/index.js';
import { initIcons, initTheme } from '@sap-ux/ui-components';

/**
 * Initialization of i18n and icons
 */
initI18n();
initTheme();
initIcons();

const rootElementId = 'root';

const container = document.getElementById(rootElementId);
if (container) {
    createRoot(container).render(
        <React.StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </React.StrictMode>
    );
}

actions.webViewReady();
