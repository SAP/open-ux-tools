/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-member-access,
                  @typescript-eslint/no-unsafe-argument,
                  no-console */

/**
 * Calculates the script content for accessing the right sap/ushell/bootstrap sandbox.
 * @param fnCallback {Function} The callback function to be executed after the bootstrap is loaded.
 */
async function ushellBootstrap(fnCallback) {
    const basePath = window['data-open-ux-preview-basePath'] ?? '';

    let src = `${basePath}/test-resources/sap/ushell/bootstrap/sandbox.js`;
    try {
        const response = await fetch(`${basePath}/resources/sap-ui-version.json`);
        const json = await response.json();
        const version = json?.libraries?.find((lib) => lib.name === 'sap.ui.core')?.version ?? '1.121.0';
        const [major, minor] = version.split('.');
        const majorUi5Version = parseInt(major, 10);
        const minorUi5Version = parseInt(minor, 10);
        if (majorUi5Version >= 2) {
            src = `${basePath}/resources/sap/ushell/bootstrap/sandbox2.js`;
        }

        // For UI5 version 1.71 and below, we need to remove the asyncHints.requests to load the changes in an Adaptation project.
        // This logic needs to be executed here to have a reliable check for UI5 version and remove the asyncHints.requests before the sandbox is loaded.
        // The sandbox shell modifies the `window['sap-ushell-config']`.
        if (majorUi5Version === 1 && minorUi5Version < 72) {
            const getNestedProperty = (obj, target) =>
                target in obj
                    ? obj[target]
                    : Object.values(obj).reduce((acc, val) => {
                          if (acc !== undefined) return acc;
                          if (typeof val === 'object') return getNestedProperty(val, target);
                      }, undefined);
            
                const asyncHints = getNestedProperty(window['sap-ushell-config'], 'asyncHints');
                asyncHints?.requests = [];
        }
    } catch (error) {
        console.warn('Failed to fetch sap-ui-version.json. Assuming it is a 1.x version.');
    }

    // eslint-disable-next-line fiori-custom/sap-no-dom-access,fiori-custom/sap-browser-api-warning
    const shellBootstrap = document.getElementById('sap-ushell-bootstrap');
    if (shellBootstrap) {
        shellBootstrap.onload = () => {
            window['sap-ui-config']['xx-bootTask'](fnCallback);
        };
        shellBootstrap.setAttribute('src', src);
    }
}

// eslint-disable-next-line fiori-custom/sap-no-global-define
window['sap-ui-config'] = {
    'xx-bootTask': ushellBootstrap
};
