const jestCLI = require('jest');
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
            hasError = true;
        }
        expect(hasError).toBe(false);
    });
});
