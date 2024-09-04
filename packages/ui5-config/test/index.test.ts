import { AuthenticationType } from '@sap-ux/store';
import type { BspApp, UI5ProxyConfig } from '../src';
import { UI5Config } from '../src';

describe('UI5Config', () => {
    // values for testing
    const path = '/~testpath~',
        url = 'http://localhost:8080',
        destination = '~destination~',
        destinationInstance = '~destinationInstance~',
        client = '012';

    const annotationsConfig = [
        {
            localPath: './webapp/annotations/annotations.xml',
            urlPath: 'annotations.xml'
        }
    ];
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

    describe('setMetadata', () => {
        test('set name and copyright', () => {
            ui5Config.setMetadata({ name: 'test.name', copyright: '©' });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('replace metadata', () => {
            ui5Config.setMetadata({ name: 'replace.me', copyright: 'Should not exist after replace' });
            ui5Config.setMetadata({ name: 'the.replaced.name' });
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('getType / setType', () => {
        test('set type', () => {
            ui5Config.setType('application');
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('get type', () => {
            ui5Config.setType('module');
            expect(ui5Config.getType()).toBe('module');
        });

        test('replace type', () => {
            ui5Config.setType('application');
            ui5Config.setType('library');
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('add/get/remove/CustomConfiguration', () => {
        const testConfig = {
            url: 'https://test.example',
            client: '123'
        };
        test('First configuration in a document', () => {
            ui5Config.addCustomConfiguration('target', testConfig);
            expect(ui5Config.getCustomConfiguration('target')).toEqual(testConfig);
        });
        test('Add multiple configurations', () => {
            const anotherConfig = '~config';
            ui5Config.addCustomConfiguration('target', testConfig);
            ui5Config.addCustomConfiguration('another', anotherConfig);
            expect(ui5Config.getCustomConfiguration('target')).toEqual(testConfig);
            expect(ui5Config.getCustomConfiguration('another')).toBe(anotherConfig);
        });

        test('Remove configuration', () => {
            ui5Config.addCustomConfiguration('config', testConfig);
            ui5Config.removeConfig('customConfiguration');
            expect(ui5Config.getCustomConfiguration('config')).toBeUndefined();
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

        test('add / get commonly configured backend (and UI5 defaults)', () => {
            const backend = [
                {
                    url,
                    path,
                    destination,
                    destinationInstance
                },
                {
                    url,
                    path,
                    destination,
                    destinationInstance,
                    authenticationType: AuthenticationType.ReentranceTicket
                }
            ];
            ui5Config.addFioriToolsProxydMiddleware({
                backend,
                ui5: {}
            });
            expect(ui5Config.toString()).toMatchSnapshot();

            const backendConfigs = ui5Config.getBackendConfigsFromFioriToolsProxydMiddleware();
            expect(backendConfigs).toEqual(backend);
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
            ui5Config.addBackendToFioriToolsProxydMiddleware({
                url,
                path
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('should add comments with backend authentication type as reentrance ticket', () => {
            ui5Config.addFioriToolsProxydMiddleware({ ui5: {} });
            ui5Config.addBackendToFioriToolsProxydMiddleware({
                url,
                path,
                authenticationType: AuthenticationType.ReentranceTicket
            });
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
        test('add with path and annotationsConfig', () => {
            ui5Config.addMockServerMiddleware(path, annotationsConfig);
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    test('getAppReloadMiddlewareConfig', () => {
        ui5Config.addFioriToolsAppReloadMiddleware();
        expect(ui5Config.toString()).toMatchSnapshot();
    });

    describe('add/find/update/removeCustomMiddleware', () => {
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

        test('findCustomMiddleware', () => {
            ui5Config.addCustomMiddleware([customMiddleware]);
            const found = ui5Config.findCustomMiddleware(customMiddleware.name);
            expect(found).toMatchObject(customMiddleware);
        });

        test('updateMiddleware that did not exist, should add it', () => {
            ui5Config.updateCustomMiddleware(customMiddleware);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('removeFioriToolsPreviewMiddleware if provided in ui5 config', () => {
            const customPreviewMiddleware = {
                name: 'fiori-tools-preview',
                afterMiddleware: 'fiori-tools-appreload',
                configuration: {
                    component: 'felropv2tsodatanone',
                    ui5Theme: 'sap_horizon'
                }
            };
            ui5Config.addCustomMiddleware([customPreviewMiddleware]);
            ui5Config.removeFioriToolsPreviewMiddleware();
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('removeFioriToolsPreviewMiddleware does not do anything when fiori-tools-preview not available', () => {
            const customPreviewMiddleware = {
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
            ui5Config.addCustomMiddleware([customPreviewMiddleware]);
            ui5Config.removeFioriToolsPreviewMiddleware();
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('updateMiddleware existing middleware', () => {
            const middlewareUpdate = {
                name: 'custom-middleware',
                afterMiddleware: '~newMiddleware',
                configuration: {
                    newValue: {
                        should: 'overwrite existing'
                    }
                }
            };
            ui5Config.addCustomMiddleware([customMiddleware]);
            ui5Config.updateCustomMiddleware(middlewareUpdate);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('removeMiddleware', () => {
            ui5Config.addCustomMiddleware([customMiddleware]);
            ui5Config.removeCustomMiddleware(customMiddleware.name);
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('add/find/removeCustomTask', () => {
        const customTask = {
            name: 'ui5-task-zipper',
            afterTask: 'generateCachebusterInfo',
            configuration: {
                archiveName: 'my-archive'
            }
        };

        test('addCustomTask', () => {
            ui5Config.addCustomTasks([customTask]);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('findCustomTask', () => {
            const notFound = ui5Config.findCustomTask(customTask.name);
            expect(notFound).toBeUndefined();
            ui5Config.addCustomTasks([customTask]);
            const found = ui5Config.findCustomTask(customTask.name);
            expect(found).toMatchObject(customTask);
            ui5Config.removeCustomTask(customTask.name);
            const removed = ui5Config.findCustomTask(customTask.name);
            expect(removed).toBeUndefined();
        });

        test('removeCustomTask', () => {
            ui5Config.addCustomTasks([customTask]);
            ui5Config.removeCustomTask(customTask.name);
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('addAbapDeployTask', () => {
        const app: BspApp = {
            name: '~name',
            description: '~description',
            'package': '~package',
            transport: '~transport'
        };

        test('local settings', () => {
            ui5Config.addAbapDeployTask({ url, client }, app);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('minimal adp settings', () => {
            ui5Config.addAbapDeployTask(
                { url, client },
                {
                    package: '$TMP'
                }
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('use open source task', () => {
            ui5Config.addAbapDeployTask({ url, client }, app, false, ['/test/'], true);
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

    describe('addServeStaticConfig', () => {
        const serveStaticMiddleware = {
            name: 'fiori-tools-servestatic',
            afterMiddleware: 'compression',
            configuration: {
                paths: [
                    { path: '/resources/targetapp', src: '/targetapp/abeppw' },
                    { path: '/appconfig', src: '/srcapp/appconfig' }
                ]
            }
        };

        const fioriToolsProxy = {
            name: 'fiori-tools-proxy',
            afterMiddleware: 'compression',
            configuration: {
                ignoreCertError: false,
                backend: [
                    {
                        path: '/sap',
                        url: 'http://test.url.com:50017'
                    }
                ]
            }
        };

        test('add with single path (no existing serve static config)', () => {
            ui5Config.addServeStaticConfig([{ path, src: '/~src', fallthrough: false }]);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add with multiple paths (existing config)', () => {
            ui5Config.addCustomMiddleware([serveStaticMiddleware]);

            ui5Config.addServeStaticConfig([
                { path: '/~path', src: '/~src', fallthrough: false },
                { path: '/~otherPath', src: '/~otherSrc', fallthrough: false }
            ]);
            expect(ui5Config.toString()).toMatchSnapshot();

            ui5Config.addServeStaticConfig([{ path: '/~newPath', src: '/~newSrc', fallthrough: false }]);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('update serve static config', () => {
            ui5Config.addCustomMiddleware([serveStaticMiddleware, fioriToolsProxy]);

            ui5Config.addServeStaticConfig([
                { path, src: '/~src', fallthrough: false },
                { path: '/~other', src: '/~otherSrc', fallthrough: false }
            ]);
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });
});
