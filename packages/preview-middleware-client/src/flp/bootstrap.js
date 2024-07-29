window['sap-ui-config'] = {
    'xx-bootTask': ushellBootstrap
};

/**
 * Calculates the script content for accessing the right sap/ushell/bootstrap sandbox.
 * @param fnCallback {Function} The callback function to be executed after the bootstrap is loaded.
 */
async function ushellBootstrap(fnCallback) {
    const response = await fetch('/resources/sap-ui-version.json');
    const json = await response.json();
    const version = json?.version;
    const major = version ? parseInt(version.split('.')[0], 10) : 2;
    const src =
        major >= 2 ? '/resources/sap/ushell/bootstrap/sandbox2.js' : '/test-resources/sap/ushell/bootstrap/sandbox.js';
    const shellBootstrap = document.getElementById('sap-ushell-bootstrap');
    if (shellBootstrap) {
        shellBootstrap.onload = () => {
            window['sap-ui-config']['xx-bootTask'](fnCallback);
        };
        shellBootstrap.setAttribute('src', src);
    }
}
