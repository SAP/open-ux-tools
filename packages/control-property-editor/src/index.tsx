import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { initIcons } from '@sap-ux/ui-components';
import type { Scenario } from '@sap-ux-private/control-property-editor-common';
import { enableTelemetry } from '@sap-ux-private/control-property-editor-common';
import { initI18n } from './i18n';

import './index.css';
import App from './App';
import { store } from './store';
import { registerAppIcons } from './icons';
import { initializeLivereload, setProjectScenario, setFeatureToggles } from './slice';

export interface StartOptions {
    previewUrl: string;
    rootElementId: string;
    livereloadPort: number;
    /**
     * Url used to connect to the livereload service. If provided, livereloadPort option is ignored.
     */
    livereloadUrl?: string;
    telemetry?: boolean;
    scenario: Scenario;
    features?: { feature: string; isEnabled: boolean }[];
}

/**
 *  Start Control Property Editor with options.
 *
 * @param options StartOptions
 */
export function start(options: StartOptions): void {
    const { previewUrl, rootElementId, telemetry = false, scenario, features = [] } = options;
    if (telemetry) {
        enableTelemetry();
    }
    initI18n();
    registerAppIcons();
    initIcons();

    store.dispatch(setFeatureToggles(features));
    store.dispatch(setProjectScenario(scenario));
    store.dispatch(initializeLivereload({ port: options.livereloadPort, url: options.livereloadUrl }));

    ReactDOM.render(
        <React.StrictMode>
            <Provider store={store}>
                <App previewUrl={previewUrl} scenario={scenario} />
            </Provider>
        </React.StrictMode>,
        document.getElementById(rootElementId)
    );
}
