import { UI5Config, AbapApp } from '../src';

describe('UI5Config', () => {
    // values for testing
    const path = '/~testpath~',
        url = 'http://localhost:8080',
        destination = '~destination~',
        destinationInstance = '~destinationInstance~',
        client = '012';

    // object under test
    let ui5Config: UI5Config;
    beforeEach(async () => {
        ui5Config = await UI5Config.newInstance('');
    });

    describe('addUI5Framework', () => {
        test('Minimal set of inputs', () => {
            ui5Config.addUI5Framework('SAPUI5', '1.64.0', []);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('Add with specific theme and additional library', () => {
            ui5Config.addUI5Framework('SAPUI5', '1.64.0', ['sap.m'], 'sap_belize');
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('Use a dark theme', () => {
            ui5Config.addUI5Framework('SAPUI5', '1.64.0', ['sap.m'], 'sap_fiori_3_dark');
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('addFioriToolsProxydMiddleware', () => {
        test('add without backend or UI5', () => {
            ui5Config.addFioriToolsProxydMiddleware({});
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add without backend or but UI5 defaults', () => {
            ui5Config.addFioriToolsProxydMiddleware({ ui5: {} });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add without backend or but all properties for UI5', () => {
            ui5Config.addFioriToolsProxydMiddleware({
                ui5: {
                    directLoad: true,
                    path: ['/~customResources', '/~other'],
                    url: 'http://~url',
                    version: '1.23.3'
                }
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add commonly configured backend (and UI5 defaults)', () => {
            ui5Config.addFioriToolsProxydMiddleware({
                backend: [{ url, path, destination, destinationInstance }],
                ui5: {}
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend with flexible parameters (and UI5 defaults)', () => {
            ui5Config.addFioriToolsProxydMiddleware({
                backend: [{ url, path, pathPrefix: '/~prefix', scp: true }],
                ui5: {}
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend without destination (and UI5 defaults)', () => {
            ui5Config.addFioriToolsProxydMiddleware({ backend: [{ url, path, client }], ui5: {} });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend without path or destination (and UI5 defaults)', () => {
            ui5Config.addFioriToolsProxydMiddleware({ backend: [{ url }], ui5: {} });
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('addBackendToFioriToolsProxydMiddleware', () => {
        test('add proxy without out backend first and then call add backend', () => {
            ui5Config.addFioriToolsProxydMiddleware({ ui5: {} });
            ui5Config.addBackendToFioriToolsProxydMiddleware({ url, path });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('try adding backend without a proxy middleware added before', () => {
            ui5Config.addFioriToolsAppReloadMiddleware();
            expect(() => ui5Config.addBackendToFioriToolsProxydMiddleware({ url, path })).toThrowError();
        });
    });

    describe('addMockServerMiddleware', () => {
        test('add with given path', () => {
            ui5Config.addMockServerMiddleware(path);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add without path', () => {
            ui5Config.addMockServerMiddleware();
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    test('getAppReloadMiddlewareConfig', () => {
        ui5Config.addFioriToolsAppReloadMiddleware();
        expect(ui5Config.toString()).toMatchSnapshot();
    });

    describe('add/removeCustomMiddleware', () => {
        const customMiddleware = {
            name: 'custom-middleware',
            afterMiddleware: '~otherMiddleware',
            configuration: {
                param1: 35729,
                other: 'webapp'
            }
        };
        test('addCustomMiddleware', () => {
            ui5Config.addCustomMiddleware([customMiddleware]);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('removeMiddleware', () => {
            ui5Config.addCustomMiddleware([customMiddleware]);
            ui5Config.removeCustomMiddleware('custom-middleware');
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    test('addCustomTask', () => {
        ui5Config.addCustomTasks([
            {
                name: 'ui5-task-zipper',
                afterTask: 'generateCachebusterInfo',
                configuration: {
                    archiveName: 'my-archive'
                }
            }
        ]);
        expect(ui5Config.toString()).toMatchSnapshot();
    });

    describe('addAbapDeployTask', () => {
        const app: AbapApp = {
            name: '~name',
            desription: '~description',
            package: '~package',
            transport: '~transport'
        };

        test('local settings', () => {
            ui5Config.addAbapDeployTask({ url, client }, app);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('AppStudio + Steampunk settings', () => {
            ui5Config.addAbapDeployTask(
                {
                    destination,
                    scp: true
                },
                app
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });
});
