/**
 * Calculates the script content for accessing the right sap/ushell/bootstrap sandbox.
 */
(window as any)['sap-ui-config'] = {
    'open-ux-bootTask': ushellBootstrap
};

function ushellBootstrap(fnCallback: any) {
    fetch('/resources/sap-ui-version.json')
        .then((resp) => resp.json())
        .then((json) => {
            const version = json?.version;
            const major = version ? parseInt(version.split('.')[0], 10) : 2;
            const src =
                major >= 2
                    ? '/resources/sap/ushell/bootstrap/sandbox2.js'
                    : '/test-resources/sap/ushell/bootstrap/sandbox.js';
            const shellBootstrap = document.getElementById('sap-ushell-bootstrap');
            if (shellBootstrap) {
                shellBootstrap.onload = () => {
                    (window as any)['sap-ui-config']['open-ux-bootTask'](fnCallback);
                };
                shellBootstrap.setAttribute('src', src);
            }
        });
}
