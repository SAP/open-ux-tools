import { getUi5Version, isLowerThanMinimalUi5Version } from '../utils/version';

/**
 * Initializes UI5 connectors based on the current UI5 version.
 *
 * For UI5 versions below 1.84, this function dynamically requires and executes a FakeLrepConnector.
 * For UI5 versions 1.84 and above, a local connector that reuses the WorkspaceConnector is being defined in preview-middleware/src/base/config.ts.
 * This setup allows for flexibility in using different connectors based on the UI5 version.
 *
 * @example
 * intiConnectors(); // Simply call the function without any arguments.
 */
export default async function initConnectors(): Promise<void> {
    const ui5Version = await getUi5Version();
    if (isLowerThanMinimalUi5Version(ui5Version, { major: 1, minor: 84 }) && ui5Version.isCdn) {
        sap.ui.require(['open/ux/preview/client/flp/enableFakeConnector'], function (enableFakeConnector: () => void) {
            enableFakeConnector();
        });
    }
}
