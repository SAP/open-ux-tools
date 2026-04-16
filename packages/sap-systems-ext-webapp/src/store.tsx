import React from 'react';
import ReactDOM from 'react-dom';
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

ReactDOM.render(
    (
        <React.StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </React.StrictMode>
    ) as any,
    document.getElementById(rootElementId)
);

actions.webViewReady();
