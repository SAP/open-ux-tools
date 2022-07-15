import { UI5Config, AbapApp, UI5ProxyConfig } from '../src';

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

    describe('get/setConfiguration', () => {
        test('get empty configuration', () => {
            expect(ui5Config.getConfiguration()).toMatchObject({});
        });

        test('set first time', () => {
            const config = {
                paths: {
                    webapp: '~/my/webapp'
                }
            };
            ui5Config.setConfiguration(config);
            expect(ui5Config.getConfiguration()).toMatchObject(config);
        });

        test('replace existing', () => {
            ui5Config.setConfiguration({
                propertiesFileSourceEncoding: 'ISO-8859-1',
                paths: {
                    webapp: '~/old/webapp',
                    src: '~/src'
                }
            });
            const config = {
                paths: {
                    webapp: '~/my/webapp'
                }
            };
            ui5Config.setConfiguration(config);
            expect(ui5Config.getConfiguration()).toMatchObject(config);
        });
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

        test('Use horizon high dark theme', () => {
            ui5Config.addUI5Framework('SAPUI5', '1.96.0', ['sap.m'], 'sap_horizon_dark');
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('Use horizon high contrast white theme', () => {
            ui5Config.addUI5Framework('SAPUI5', '1.96.0', ['sap.m'], 'sap_horizon_hcw');
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('Use horizon high contrast black theme', () => {
            ui5Config.addUI5Framework('SAPUI5', '1.96.0', ['sap.m'], 'sap_horizon_hcb');
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

    describe('addUi5ToFioriToolsProxydMiddleware', () => {
        test('add ui5 config to empty tools middleware config', () => {
            ui5Config.addFioriToolsProxydMiddleware({});
            ui5Config.addUi5ToFioriToolsProxydMiddleware({
                path: ['/~customResources', '/~other'],
                url: 'http://~url'
            });
            expect(ui5Config.toString()).toMatchSnapshot();
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
                ui5: {
                    path: ['/resources', '/test-resources'],
                    url: 'http://ui5.example'
                },
                version: '1.95.1',
                debug: true
            } as UI5ProxyConfig
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
