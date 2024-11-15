const { initUI5Environment } = require('../src/ui5Environment');

describe('Jest Environment UI5', () => {
    it('should be able to run a test', async () => {
        const window = { performance: {}, window: {} };
        const pathMapping = jest.fn();
        initUI5Environment(window, pathMapping, false);
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
});
