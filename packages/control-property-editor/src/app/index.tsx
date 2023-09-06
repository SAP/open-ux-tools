import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { initIcons } from '@sap-ux/ui-components';
import { initI18n } from './i18n';

import './index.css';
import App from './App';
import { store } from './store';
import type { ThemeName } from './components';
import { setThemeOnDocument } from './components';
import { registerAppIcons } from './icons';

export interface StartOptions {
    previewUrl: string;
    rootElementId: string;
}

/**
 *
 * @param root0
 * @param root0.previewUrl
 * @param root0.rootElementId
 */
export function start({ previewUrl, rootElementId }: StartOptions): void {
    initI18n();
    registerAppIcons();
    initIcons();

    const theme = localStorage.getItem('theme') ?? 'dark';
    setThemeOnDocument(theme as ThemeName);

    ReactDOM.render(
        <React.StrictMode>
            <Provider store={store}>
                <App previewUrl={previewUrl} />
            </Provider>
        </React.StrictMode>,
        document.getElementById(rootElementId)
    );
}
