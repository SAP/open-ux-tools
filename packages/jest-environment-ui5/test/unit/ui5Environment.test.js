const { initUI5Environment } = require('../../src/env/ui5Environment');

describe('Jest Environment UI5', () => {
    it('should be able to run a test', async () => {
        const window = { performance: {}, window: {} };
        const pathMapping = jest.fn();
        initUI5Environment(window, pathMapping, false, { libs: 'sap.ui.core, sap.m' });
        expect(window.jestUI5).toBeDefined();
        window.jestUI5.resolvePath('test');
        expect(pathMapping).toHaveBeenCalled();
        expect(window.window).toMatchInlineSnapshot(`
            Object {
              "sap-ui-config": Object {
                "async": true,
                "bindingSyntax": "complex",
                "calendarType": "Gregorian",
                "language": "EN",
                "libs": "sap.ui.core, sap.m",
                "loglevel": "INFO",
                "resourceRoots": Object {
                  "": "",
                },
                "xx-waitForTheme": false,
              },
            }
        `);
    });

    describe('fetch mock', () => {
        const initWindow = (ui5Version) => {
            const window = { performance: {}, window: {} };
            initUI5Environment(window, jest.fn(), true, ui5Version);
            return window;
        };

        it('synthesizes a complete response for sap-ui-version.json', async () => {
            const ui5Version = { name: 'sap.ui.core', version: '2.0.0', libraries: [] };
            const window = initWindow(ui5Version);

            const response = await window.fetch('resources/sap-ui-version.json');

            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toEqual(ui5Version);
            expect(JSON.parse(response.text())).toEqual(ui5Version);
        });

        it('falls back to a default version object when none is provided', async () => {
            const window = initWindow(undefined);

            const response = await window.fetch('sap-ui-version.json');

            expect(response.ok).toBe(true);
            await expect(response.json()).resolves.toMatchObject({ name: 'sap.ui.core', version: '2.0.0' });
        });

        it('serves other resources from disk with a well-formed response', async () => {
            const window = initWindow(undefined);
            window.sap = { ui: { loader: { _: { getResourcePath: () => __filename } } } };

            const response = await window.fetch('resources/anything.js');

            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
            expect(response.text()).toContain('fetch mock');
        });
    });
});
