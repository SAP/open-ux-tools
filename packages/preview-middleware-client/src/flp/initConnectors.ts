import VersionInfo from 'sap/ui/VersionInfo';

/**
 * Initializes UI5 connectors based on the current UI5 version.
 *
 * For UI5 versions below 1.72, this function dynamically requires and executes a FakeLrepConnector.
 * For UI5 versions 1.72 and above, it defines a local connector that reuses the WorkspaceConnector.
 * This setup allows for flexibility in using different connectors based on the UI5 version.
 *
 * @example
 * initConnectors(); // Simply call the function without any arguments.
 * @returns {void}
 */
export default async function initConnectors(): Promise<void> {
    const { version } = (await VersionInfo.load()) as { version: string };
    const versionArray = version ? version.split('.') : ['2', '99'];
    const minor = parseInt(versionArray[1], 10);
    const major = parseInt(versionArray[0], 10);

    if (major === 1 && minor < 72) {
        sap.ui.require(['open/ux/preview/client/flp/enableFakeConnector'], function (enableFakeConnector: () => void) {
            enableFakeConnector();
        });
    } else {
        sap.ui.define(
            'custom.connectors.WorkspaceConnector',
            ['open/ux/preview/client/flp/WorkspaceConnector'],
            (connector: object) => connector,
            true
        );
    }
}
