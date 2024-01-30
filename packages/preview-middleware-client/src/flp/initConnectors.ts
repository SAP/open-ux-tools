/**
 * Initializes UI5 connectors based on the current UI5 version.
 *
 * For UI5 versions below 1.72, this function dynamically requires and executes a FakeLrepConnector.
 * For UI5 versions 1.72 and above, it defines a local connector that reuses the WorkspaceConnector.
 * This setup allows for flexibility in using different connectors based on the UI5 version.
 *
 * @example
 * intiConnectors(); // Simply call the function without any arguments.
 * @returns {void}
 */
export function initConnectors(): void {
    const version = sap.ui.version;
    const minor = Number(version.split(/[.-]/)[1]);

    if (minor < 72) {
        sap.ui.require(['open/ux/preview/client/flp/enableFakeConnector'], function (enableFakeConnector: () => void) {
            enableFakeConnector();
        });
    } else {
        sap.ui.define(
            'open.ux.preview.client.flp.LocalConnector',
            ['open/ux/preview/client/flp/WorkspaceConnector'],
            function (WorkspaceConnector: any) {
                'use strict';

                return WorkspaceConnector;
            },
            true
        );
    }
}

initConnectors();
