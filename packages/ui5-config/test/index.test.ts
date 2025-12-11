import { AuthenticationType } from '@sap-ux/store';
import type { BspApp, FioriToolsProxyConfig, UI5ProxyConfig } from '../src';
import { UI5Config } from '../src';
import { fioriToolsProxy } from '../src/constants';

describe('UI5Config', () => {
    // values for testing
    const path = '/~testpath~',
        name = 'mainService',
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

    describe('Schema validation', () => {
        test('newInstance with schema validation error', async () => {
            try {
                await UI5Config.newInstance('', { validateSchema: true });
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('newInstance with schema validation success', async () => {
            const yamlString = `
            specVersion: '4.0'
            metadata:
              name: com.sap.cap.fe.ts.sample
              allowSapInternal: true
            type: application
            framework:
              name: SAPUI5
              version: 1.124.0
            `;
            expect(await UI5Config.newInstance(yamlString, { validateSchema: true })).toMatchSnapshot();
        });

        test('validateSchema true', async () => {
            const yamlString = `
            specVersion: '4.0'
            metadata:
              name: com.sap.cap.fe.ts.sample
              allowSapInternal: true
            type: application
            framework:
              name: SAPUI5
              version: 1.124.0
            `;
            const instance = await UI5Config.newInstance(yamlString, { validateSchema: true });
            expect(await instance.validateSchema()).toBeTruthy();
        });

        test('validateSchema false', async () => {
            expect(await ui5Config.validateSchema()).toBeFalsy();
        });
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
            expect(ui5Config.getUi5Framework()).toStrictEqual({
                name: 'SAPUI5',
                version: '1.64.0',
                libraries: [{ name: 'sap.m' }, { name: 'themelib_sap_belize' }]
            });
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

    describe('addFioriToolsProxyMiddleware', () => {
        test('add without backend or UI5', () => {
            ui5Config.addFioriToolsProxyMiddleware({});
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add without backend or but UI5 defaults', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {} });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add without backend or but all properties for UI5', () => {
            ui5Config.addFioriToolsProxyMiddleware({
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
            ui5Config.addFioriToolsProxyMiddleware({
                backend,
                ui5: {}
            });
            expect(ui5Config.toString()).toMatchSnapshot();

            const backendConfigs = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware();
            expect(backendConfigs).toEqual(backend);
        });

        test('add backend with flexible parameters (and UI5 defaults) & writes ignoreCertError true if enabled', () => {
            ui5Config.addFioriToolsProxyMiddleware({
                backend: [{ url, path, pathPrefix: '/~prefix', scp: true }],
                ignoreCertError: true,
                ui5: {}
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend with flexible parameters (and UI5 defaults) & writes ignoreCertErrors true if enabled', () => {
            ui5Config.addFioriToolsProxyMiddleware({
                backend: [{ url, path, pathPrefix: '/~prefix', scp: true }],
                ignoreCertErrors: true,
                ui5: {}
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend without destination (and UI5 defaults)', () => {
            ui5Config.addFioriToolsProxyMiddleware({ backend: [{ url, path, client }], ui5: {} });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend without path or destination (and UI5 defaults)', () => {
            ui5Config.addFioriToolsProxyMiddleware({ backend: [{ url }], ui5: {} });
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('addBackendToFioriToolsProxyMiddleware', () => {
        test('add proxy without out backend first and then call add backend', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {} });
            ui5Config.addBackendToFioriToolsProxyMiddleware({
                url,
                path
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add backend and update the "ignoreCertError" property', () => {
            const expectedIgnoreCertErrors = true;
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {}, ignoreCertError: false });
            ui5Config.addBackendToFioriToolsProxyMiddleware(
                {
                    url,
                    path
                },
                expectedIgnoreCertErrors
            );
            const fioriToolsProxyMiddlewareConfig =
                ui5Config.findCustomMiddleware<FioriToolsProxyConfig>(fioriToolsProxy)?.configuration;
            expect(fioriToolsProxyMiddlewareConfig?.ignoreCertErrors).toEqual(expectedIgnoreCertErrors);
        });

        test('add backend and do not update the "ignoreCertError" property', () => {
            const expectedIgnoreCertErrors = false;
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {}, ignoreCertErrors: false });
            ui5Config.addBackendToFioriToolsProxyMiddleware(
                {
                    url,
                    path
                },
                expectedIgnoreCertErrors
            );
            const fioriToolsProxyMiddlewareConfig =
                ui5Config.findCustomMiddleware<FioriToolsProxyConfig>(fioriToolsProxy)?.configuration;
            expect(fioriToolsProxyMiddlewareConfig?.ignoreCertErrors).toEqual(expectedIgnoreCertErrors);
        });

        test('handle duplicate backend', () => {
            ui5Config.addFioriToolsProxyMiddleware({
                backend: [
                    { url, path },
                    { url, path: '/sap' }
                ],
                ui5: {}
            });
            // Add same backend
            ui5Config.addBackendToFioriToolsProxyMiddleware({
                url,
                path
            });
            const fioriToolsProxyMiddlewareConfig =
                ui5Config.findCustomMiddleware<FioriToolsProxyConfig>(fioriToolsProxy)?.configuration;
            expect(fioriToolsProxyMiddlewareConfig?.backend).toStrictEqual([
                {
                    path: '/~testpath~',
                    url: 'http://localhost:8080'
                },
                {
                    path: '/sap',
                    url: 'http://localhost:8080'
                }
            ]);
        });

        test('should add comments with backend authentication type as reentrance ticket', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {} });
            ui5Config.addBackendToFioriToolsProxyMiddleware({
                url,
                path,
                authenticationType: AuthenticationType.ReentranceTicket
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('try adding backend without a proxy middleware added before', () => {
            ui5Config.addFioriToolsAppReloadMiddleware();
            expect(() => ui5Config.addBackendToFioriToolsProxyMiddleware({ url, path })).toThrow();
        });

        test('Should add preview middlewares correctly', () => {
            ui5Config.updateCustomMiddleware({
                name: 'fiori-tools-preview',
                afterMiddleware: 'fiori-tools-appreload',
                configuration: { flp: { theme: 'sap_fiori_3' } }
            });
            expect(ui5Config.toString().replace(/\s+/g, ' ').trim()).toBe(
                `
                    server:
                        customMiddleware:
                            - name: fiori-tools-preview
                            afterMiddleware: fiori-tools-appreload
                            configuration:
                            flp: 
                            theme: sap_fiori_3
                `
                    .replace(/\s+/g, ' ')
                    .trim()
            );
        });

        test('Should add preview middlewares correctly with more flp config options', () => {
            ui5Config.updateCustomMiddleware({
                name: 'fiori-tools-preview',
                afterMiddleware: 'fiori-tools-appreload',
                configuration: {
                    flp: {
                        theme: 'sap_fiori_3',
                        path: 'test/flpSandbox.html',
                        intent: { object: 'testapp', action: 'display' }
                    }
                }
            });
            expect(ui5Config.toString().replace(/\s+/g, ' ').trim()).toBe(
                `
                    server:
                        customMiddleware:
                            - name: fiori-tools-preview
                            afterMiddleware: fiori-tools-appreload
                            configuration:
                            flp: 
                            theme: sap_fiori_3
                            path: test/flpSandbox.html
                            intent:
                                object: testapp
                                action: display
                `
                    .replace(/\s+/g, ' ')
                    .trim()
            );
        });
    });

    describe('updateBackendToFioriToolsProxyMiddleware', () => {
        test('add proxy with backend first and then call update for existing backend', () => {
            ui5Config.addFioriToolsProxyMiddleware({
                backend: [{ url, path }],
                ui5: {}
            });
            let fioriToolsProxyMiddleware = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            ui5Config.updateBackendToFioriToolsProxyMiddleware({ path, url: 'updated' });
            fioriToolsProxyMiddleware = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            expect(fioriToolsProxyMiddleware?.configuration.backend).toStrictEqual([
                {
                    path,
                    url: 'updated'
                }
            ]);
        });

        test('add proxy with backend first and then call update for unexisting backend', () => {
            ui5Config.addFioriToolsProxyMiddleware({
                backend: [{ url, path }],
                ui5: {}
            });
            let fioriToolsProxyMiddleware = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            ui5Config.updateBackendToFioriToolsProxyMiddleware({ path: 'dummy', url: 'updated' });
            fioriToolsProxyMiddleware = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            expect(fioriToolsProxyMiddleware?.configuration.backend).toStrictEqual([
                {
                    path,
                    url
                }
            ]);
        });
    });

    describe('removeBackendFromFioriToolsProxyMiddleware', () => {
        test('add proxy with backend first and then call remove for existing backend', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ url, path }] });
            let fioriToolsProxyMiddleware = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            expect(fioriToolsProxyMiddleware?.configuration).toStrictEqual({
                ignoreCertErrors: false,
                backend: [
                    {
                        url: 'http://localhost:8080',
                        path: '/~testpath~'
                    }
                ],
                ui5: { path: ['/resources', '/test-resources'], url: 'https://ui5.sap.com' }
            });
            ui5Config.removeBackendFromFioriToolsProxyMiddleware(path);
            fioriToolsProxyMiddleware = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            expect(fioriToolsProxyMiddleware?.configuration).toStrictEqual({
                ignoreCertErrors: false,
                backend: [],
                ui5: { path: ['/resources', '/test-resources'], url: 'https://ui5.sap.com' }
            });
        });

        test('add proxy with backend first and then call remove for unexisting backend', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ url, path }] });
            const initialFioriToolsProxyMiddleware =
                ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            expect(initialFioriToolsProxyMiddleware?.configuration).toStrictEqual({
                ignoreCertErrors: false,
                backend: [
                    {
                        url: 'http://localhost:8080',
                        path: '/~testpath~'
                    }
                ],
                ui5: { path: ['/resources', '/test-resources'], url: 'https://ui5.sap.com' }
            });
            ui5Config.removeBackendFromFioriToolsProxyMiddleware('dummy');
            const updatedFioriToolsProxyMiddleware =
                ui5Config.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
            // Check if nothing changed
            expect(initialFioriToolsProxyMiddleware?.configuration).toStrictEqual(
                updatedFioriToolsProxyMiddleware?.configuration
            );
        });

        test('try removing backend without a proxy middleware added before', () => {
            ui5Config.addFioriToolsAppReloadMiddleware();
            expect(() => ui5Config.removeBackendFromFioriToolsProxyMiddleware(url)).toThrow();
        });

        test('all occurances of backend should be deleted, except one with "/sap" path', () => {
            // Create proxy middleware with backend config
            ui5Config.addFioriToolsProxyMiddleware({
                backend: [
                    { url, path },
                    { url, path },
                    { url, path: '/sap' }
                ],
                ui5: {}
            });
            ui5Config.removeBackendFromFioriToolsProxyMiddleware(path);
            const fioriToolsProxyMiddlewareConfig =
                ui5Config.findCustomMiddleware<FioriToolsProxyConfig>(fioriToolsProxy)?.configuration;
            expect(fioriToolsProxyMiddlewareConfig?.backend).toStrictEqual([
                {
                    path: '/sap',
                    url: 'http://localhost:8080'
                }
            ]);
        });
    });

    describe('getBackendConfigFromFioriToolsProxyMiddleware', () => {
        test('finds the exact fit in case of a single backend entry', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ url, path }] });
            const matchingBackend = ui5Config.getBackendConfigFromFioriToolsProxyMiddleware(path);
            expect(matchingBackend).toStrictEqual({
                path: '/~testpath~',
                url: 'http://localhost:8080'
            });
        });

        test('returns undefined if no backend was found', () => {
            ui5Config.addFioriToolsProxyMiddleware({ ui5: {}, backend: [{ url, path }] });
            const matchingBackend = ui5Config.getBackendConfigFromFioriToolsProxyMiddleware('dummy');
            expect(matchingBackend).toBeUndefined();
        });

        it('finds the exact fit in case of a multiple backend entries', async () => {
            ui5Config.addFioriToolsProxyMiddleware({
                ui5: {},
                backend: [
                    { url: 'https://sap.mock2.ondemand.com', path: '/sap/opu' },
                    { url: 'https://sap.mock.ondemand.com', path: '/sap' },
                    { url, path }
                ]
            });
            const matchingBackend = ui5Config.getBackendConfigFromFioriToolsProxyMiddleware(path);
            expect(matchingBackend).toStrictEqual({
                path: '/~testpath~',
                url: 'http://localhost:8080'
            });
        });
    });

    describe('addUi5ToFioriToolsProxyMiddleware', () => {
        test('add ui5 config to empty tools middleware config', () => {
            ui5Config.addFioriToolsProxyMiddleware({});
            ui5Config.addUi5ToFioriToolsProxyMiddleware({
                path: ['/~customResources', '/~other'],
                url: 'http://~url'
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('addMockServerMiddleware', () => {
        const basePath = '/';
        const webappPath = '/webapp';
        test('add without services and annotations', () => {
            ui5Config.addMockServerMiddleware(basePath, webappPath, [], []);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add with services', () => {
            ui5Config.addMockServerMiddleware(
                basePath,
                webappPath,
                [{ serviceName: 'new-service', servicePath: '/path/to/service' }],
                []
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add with services with value list references', () => {
            ui5Config.addMockServerMiddleware(
                basePath,
                webappPath,
                [
                    {
                        serviceName: 'new-service',
                        servicePath: '/path/to/service',
                        resolveExternalServiceReferences: true
                    }
                ],
                []
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add with services and annotations', () => {
            ui5Config.addMockServerMiddleware(
                basePath,
                webappPath,
                [{ serviceName: 'new-service', servicePath: '/path/to/service' }],
                annotationsConfig
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('addServiceToMockserverMiddleware', () => {
        const basePath = '/';
        const webappPath = '/webapp';
        test('add new service', () => {
            ui5Config.addMockServerMiddleware(basePath, webappPath, [], []);
            ui5Config.addServiceToMockserverMiddleware(basePath, webappPath, {
                serviceName: 'new-service',
                servicePath: '/path/to/service'
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add new service with value list references', () => {
            ui5Config.addMockServerMiddleware(basePath, webappPath, [], []);
            ui5Config.addServiceToMockserverMiddleware(basePath, webappPath, {
                serviceName: 'new-service',
                servicePath: '/path/to/service',
                resolveExternalServiceReferences: true
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('try to add service duplicate', () => {
            ui5Config.addMockServerMiddleware(basePath, webappPath, [], []);
            ui5Config.addServiceToMockserverMiddleware(basePath, webappPath, {
                serviceName: 'new-service',
                servicePath: '/path/to/service'
            });
            ui5Config.addServiceToMockserverMiddleware(basePath, webappPath, {
                serviceName: 'new-service',
                servicePath: '/path/to/service'
            });
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add new service with annotationsConfig', () => {
            ui5Config.addMockServerMiddleware(basePath, webappPath, [], []);
            ui5Config.addServiceToMockserverMiddleware(
                basePath,
                webappPath,
                { serviceName: 'new-service', servicePath: '/path/to/service' },
                annotationsConfig
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });

    describe('removeServiceFromMockServerMiddleware', () => {
        const basePath = '/';
        const webappPath = '/webapp';
        test('remove exisisting service', () => {
            // Create middleware with one service
            ui5Config.addMockServerMiddleware(
                basePath,
                webappPath,
                [{ serviceName: 'new-service', servicePath: '/path/to/service' }],
                []
            );
            let mockserverMiddleware = ui5Config.findCustomMiddleware('sap-fe-mockserver');
            expect(mockserverMiddleware?.configuration).toStrictEqual({
                services: [
                    {
                        generateMockData: true,
                        metadataPath: './webapp/localService/new-service/metadata.xml',
                        mockdataPath: './webapp/localService/new-service/data',
                        urlPath: '/path/to/service'
                    }
                ],
                mountPath: '/',
                annotations: []
            });
            // Remove it
            ui5Config.removeServiceFromMockServerMiddleware('/path/to/service', []);
            mockserverMiddleware = ui5Config.findCustomMiddleware('sap-fe-mockserver');
            expect(mockserverMiddleware?.configuration).toStrictEqual({
                services: [],
                mountPath: '/',
                annotations: []
            });
        });

        test('remove exisisting service with annotations', () => {
            // Create middleware with one service
            ui5Config.addMockServerMiddleware(
                basePath,
                webappPath,
                [{ serviceName: 'new-service', servicePath: '/path/to/service' }],
                [{ urlPath: '/path/to/annotation' }]
            );
            let mockserverMiddleware = ui5Config.findCustomMiddleware('sap-fe-mockserver');
            expect(mockserverMiddleware?.configuration).toStrictEqual({
                services: [
                    {
                        generateMockData: true,
                        metadataPath: './webapp/localService/new-service/metadata.xml',
                        mockdataPath: './webapp/localService/new-service/data',
                        urlPath: '/path/to/service'
                    }
                ],
                mountPath: '/',
                annotations: [
                    {
                        urlPath: '/path/to/annotation'
                    }
                ]
            });
            // Remove it
            ui5Config.removeServiceFromMockServerMiddleware('/path/to/service', ['/path/to/annotation']);
            mockserverMiddleware = ui5Config.findCustomMiddleware('sap-fe-mockserver');
            expect(mockserverMiddleware?.configuration).toStrictEqual({
                services: [],
                mountPath: '/',
                annotations: []
            });
        });

        test('remove unexisting service', () => {
            // Create middleware without any services
            ui5Config.addMockServerMiddleware(basePath, webappPath, [], []);
            let mockserverMiddleware = ui5Config.findCustomMiddleware('sap-fe-mockserver');
            expect(mockserverMiddleware?.configuration).toStrictEqual({
                services: [],
                mountPath: '/',
                annotations: []
            });
            // Try to remove unexisting service
            ui5Config.removeServiceFromMockServerMiddleware('/path/to/service', []);
            mockserverMiddleware = ui5Config.findCustomMiddleware('sap-fe-mockserver');
            expect(mockserverMiddleware?.configuration).toStrictEqual({
                services: [],
                mountPath: '/',
                annotations: []
            });
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
                },
                true,
                ['/test/'],
                undefined,
                'apps/workcenter/appVariants/customer.app.variant',
                []
            );
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('use open source task', () => {
            ui5Config.addAbapDeployTask(
                { url, client, authenticationType: 'reentranceTicket' },
                app,
                false,
                ['/test/'],
                true,
                undefined,
                [
                    {
                        path: 'configuration.target.authenticationType',
                        comment: ' SAML support for vscode',
                        key: 'authenticationType'
                    }
                ]
            );
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
                ignoreCertErrors: false,
                backend: [
                    {
                        path: '/sap',
                        url: 'http://test.url.com:50017'
                    }
                ]
            } satisfies FioriToolsProxyConfig
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

    describe('addCloudFoundryDeployTask', () => {
        test('minimal settings required', () => {
            ui5Config.addCloudFoundryDeployTask('myTestAppId');
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add modules task', () => {
            ui5Config.addCloudFoundryDeployTask('myTestAppId', true);
            expect(ui5Config.toString()).toMatchSnapshot();
        });

        test('add transpile task', () => {
            ui5Config.addCloudFoundryDeployTask('myTestAppId', true, true);
            expect(ui5Config.toString()).toMatchSnapshot();
        });
    });
});
