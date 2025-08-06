const jestCLI = require('jest'); // eslint-disable-line import/no-extraneous-dependencies
const UI5DOMEnvironment = require('../../src');
describe('Custom environment', () => {
    it('Can be created', async () => {
        let failed = false;
        try {
            await jestCLI.run('--detectOpenHandles --config jest-ui5.config.js', process.cwd());
        } catch {
            failed = true;
        }
        expect(failed).toBe(false);

        // This is done centrally in the CustomEnvironment constructor but we need to call it here for the test purpose
    }, 60000);

    it('should correctly shim manifest file', () => {
        // Save original window object to restore later
        const originalWindow = global.window;

        // Setup mock window with jestUI5.mockUrl
        global.window = {
            jestUI5: {
                mockUrl: jest.fn()
            }
        };

        // Create an instance of UI5DOMEnvironment
        const domStuff = new UI5DOMEnvironment(
            { globalConfig: {}, projectConfig: { setupFiles: [], testEnvironmentOptions: {} } },
            { console: console, testPath: '' }
        );

        // Call shimManifestFile with a test library name
        const testLibName = 'sap.ui.test.lib';
        domStuff.shimManifestFile(testLibName);

        // Verify mockUrl was called with the expected parameters
        expect(window.jestUI5.mockUrl).toHaveBeenCalledWith(
            'sap/ui/test/lib/manifest.json',
            JSON.stringify({
                'sap.ui5': {
                    library: {
                        css: false
                    }
                }
            })
        );

        // Restore original window object
        global.window = originalWindow;
    });

    it('should not mock the canvas runtime if allowCSS is true', async () => {
        global.requireFn = require;
        global.CanvasRenderingContext2D = undefined;
        const domStuff = new UI5DOMEnvironment(
            { globalConfig: {}, projectConfig: { setupFiles: [], testEnvironmentOptions: { allowCSS: true } } },
            { console: console, testPath: '' }
        );
        try {
            await domStuff.setup();
        } catch (e) {
            console.error(e);
        }
        expect(global.CanvasRenderingContext2D).toBeUndefined();
    });

    it('should mock the canvas runtime if allowCSS is false', async () => {
        global.requireFn = require;
        global.CanvasRenderingContext2D = undefined;
        const domStuff = new UI5DOMEnvironment(
            { globalConfig: {}, projectConfig: { setupFiles: [], testEnvironmentOptions: {} } },
            { console: console, testPath: '' }
        );
        try {
            await domStuff.setup();
        } catch (e) {
            console.error(e);
        }

        expect(global.CanvasRenderingContext2D).toBeDefined();
        let hasError = false;
        try {
            global.CanvasRenderingContext2D();
        } catch (e) {
            hasError = e !== undefined;
        }
        expect(hasError).toBe(false);
    });
});
