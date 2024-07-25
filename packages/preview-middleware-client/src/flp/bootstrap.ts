/**
 * Calculates the script content for accessing the right sap/ushell/bootstrap sandbox.
 */
export default async function bootstrap(): Promise<void> {
    var head = document.getElementsByTagName('head')[0];
    if (head) {
        await fetch('/resources/sap-ui-version.json')
            .then((resp) => resp.json())
            .then((json) => {
                const version = json?.version;
                const major = version ? parseInt(version.split('.')[0], 10) : 2;
                var script = document.createElement('script');

                script.src =
                    major >= 2
                        ? '/resources/sap/ushell/bootstrap/sandbox2.js'
                        : '/test-resources/sap/ushell/bootstrap/sandbox.js';
                script.id = 'sap-ushell-bootstrap';
                script.type = 'text/javascript';
                head.appendChild(script);
            });
    }
}
