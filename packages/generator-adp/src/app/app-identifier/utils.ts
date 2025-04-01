import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

/**
 * Evaluates whether the application described by the manifest is a SAP Fiori Elements version 4 application.
 *
 * @param {Manifest} manifest - The application manifest to evaluate.
 * @returns {boolean} True if the application uses SAP Fiori Elements version 4 libraries.
 */
export function isV4Application(manifest: Manifest | null): boolean {
    return !!manifest?.['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'];
}

/**
 * Checks if views are loaded synchronously or asynchronously in the UI5 settings of the manifest.
 * Sets the isAppSync property based on the loading method.
 *
 * @param {Manifest['sap.ui5']} ui5Settings - The UI5 settings part of the manifest.
 * @returns {boolean} Boolean if views are loaded synchronously or asynchronously.
 */
export function isSyncLoadedView(ui5Settings: Manifest['sap.ui5']): boolean {
    if (ui5Settings?.rootView) {
        const rootView = ui5Settings?.rootView as ManifestNamespace.RootViewDefFlexEnabled;
        return !rootView.async;
    }
    if (ui5Settings?.routing && ui5Settings['routing']['config']) {
        return !ui5Settings['routing']['config']['async'];
    }

    return false;
}
