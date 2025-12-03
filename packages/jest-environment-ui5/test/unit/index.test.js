const jestCLI = require('jest'); // eslint-disable-line sonarjs/no-implicit-dependencies
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
    }, 120000);

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
    it('should properly overwrite Lib._load and Lib.init functions', () => {
        // Save original window and sap objects
        const originalWindow = global.window;
        const originalSap = global.sap;

        // Create a mock Lib object with spies
        const originalLoadFn = jest.fn().mockReturnValue('_load result');
        const originalInitFn = jest.fn().mockReturnValue('init result');

        const mockLib = {
            _load: originalLoadFn,
            init: originalInitFn
        };

        // Mock the necessary objects
        global.window = {
            jestUI5: {
                mockUrl: jest.fn()
            }
        };

        global.sap = {
            ui: {
                require: jest.fn((modules, successCallback) => {
                    // Call the success callback with the mock Lib
                    successCallback(mockLib);
                })
            }
        };

        // Create an instance of UI5DOMEnvironment with shimManifests enabled
        const domStuff = new UI5DOMEnvironment(
            {
                globalConfig: {},
                projectConfig: {
                    setupFiles: [],
                    testEnvironmentOptions: {
                        shimManifests: true
                    }
                }
            },
            { console: console, testPath: '' }
        );

        // Create a mock resolve function
        const mockResolve = jest.fn();

        // Call overwriteUi5Lib
        domStuff.overwriteUi5Lib(mockResolve, false);

        // Verify that Lib._load and Lib.init were overwritten
        expect(mockLib._load).not.toBe(originalLoadFn);
        expect(mockLib.init).not.toBe(originalInitFn);

        // Test Lib._load with string parameter
        mockLib._load('test.library');
        expect(window.jestUI5.mockUrl).toHaveBeenCalledWith('test/library/manifest.json', expect.any(String));
        expect(originalLoadFn).toHaveBeenCalledWith('test.library');

        // Test Lib._load with object parameter
        mockLib._load({ name: 'another.test.library' });
        expect(window.jestUI5.mockUrl).toHaveBeenCalledWith('another/test/library/manifest.json', expect.any(String));
        expect(originalLoadFn).toHaveBeenCalledWith({ name: 'another.test.library' });

        // Test Lib.init
        const initSettings = { name: 'test.init.library' };
        mockLib.init(initSettings);
        expect(window.jestUI5.mockUrl).toHaveBeenCalledWith('test/init/library/manifest.json', expect.any(String));

        // Verify noLibraryCSS is set correctly
        expect(initSettings.noLibraryCSS).toBe(true);
        expect(originalInitFn).toHaveBeenCalledWith(initSettings);

        // Verify resolve was called
        expect(mockResolve).toHaveBeenCalled();

        // Restore original objects
        global.window = originalWindow;
        global.sap = originalSap;
    });
});
