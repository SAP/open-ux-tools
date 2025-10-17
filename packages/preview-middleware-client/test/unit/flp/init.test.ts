import { MessageBarType, showInfoCenterMessage, type Scenario } from '@sap-ux-private/control-property-editor-common';
import { default as mockBundle } from 'mock/sap/base/i18n/ResourceBundle';
import IconPoolMock from 'mock/sap/ui/core/IconPool';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { fetchMock, sapMock } from 'mock/window';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';
import type Component from 'sap/ui/core/Component';
import type { InitRtaScript, RTAPlugin } from 'sap/ui/rta/api/startAdaptation';
import { Window } from 'types/global';
import * as apiHandler from '../../../src/adp/api-handler';
import {
    init,
    loadI18nResourceBundle,
    registerComponentDependencyPaths,
    registerSAPFonts,
    resetAppState,
    setI18nTitle
} from '../../../src/flp/init';

Object.defineProperty(window, 'location', {
    value: {
        ...window.location,
        reload: jest.fn()
    },
    writable: true
});

describe('flp/init', () => {
    afterEach(() => {
        sapMock.ushell.Container.getServiceAsync.mockReset();
    });
    test('registerSAPFonts', () => {
        registerSAPFonts();
        expect(IconPoolMock.registerFont).toHaveBeenCalledTimes(2);
    });
    test('setI18nTitle', () => {
        const title = '~testTitle';
        const mockResourceBundle = {
            hasText: jest.fn().mockReturnValueOnce(true),
            getText: jest.fn().mockReturnValueOnce(title)
        };

        setI18nTitle(mockResourceBundle, title);
        expect(document.title).toBe(title);

        mockResourceBundle.hasText.mockReturnValueOnce(false);
        setI18nTitle(mockResourceBundle);
        expect(document.title).toBe(title);
    });
    test('loadI18nResourceBundle', async () => {
        jest.spyOn(apiHandler, 'getManifestAppdescr').mockResolvedValueOnce({
            content: [
                {
                    texts: {
                        i18n: 'i18n/test/i18n.properties'
                    }
                }
            ]
        } as unknown as apiHandler.ManifestAppdescr);
        await loadI18nResourceBundle('other' as Scenario);
        expect(mockBundle.create).toHaveBeenCalledWith({
            url: 'i18n/i18n.properties'
        });
    });
    test('loadI18nResourceBundle - adaptation project', async () => {
        jest.spyOn(apiHandler, 'getManifestAppdescr').mockResolvedValueOnce({
            content: [
                {
                    texts: {
                        i18n: 'i18n/test/i18n.properties'
                    }
                }
            ]
        } as unknown as apiHandler.ManifestAppdescr);
        await loadI18nResourceBundle('ADAPTATION_PROJECT');
        expect(mockBundle.create).toHaveBeenCalledWith({
            url: '../i18n/i18n.properties',
            enhanceWith: [
                {
                    bundleUrl: '../i18n/test/i18n.properties'
                }
            ]
        });
    });

    describe('registerComponentDependencyPaths', () => {
        const loaderMock = sap.ui.loader.config as jest.Mock;
        const testManifest = {
            'sap.ui5': {
                dependencies: {
                    libs: {} as Record<string, unknown>
                },
                componentUsages: {
                    componentUsage1: {
                        'name': '',
                        'lazy': true
                    }
                }
            }
        };

        beforeEach(() => {
            loaderMock.mockReset();
        });

        test('single app, no reuse libs', async () => {
            fetchMock.mockResolvedValueOnce({ json: () => testManifest });
            await registerComponentDependencyPaths(['/'], new URLSearchParams());
            expect(loaderMock).not.toHaveBeenCalled();
        });

        test('single app, one reuse lib', async () => {
            const manifest = JSON.parse(JSON.stringify(testManifest)) as typeof testManifest;
            manifest['sap.ui5'].dependencies.libs['test.lib'] = {};
            fetchMock.mockResolvedValueOnce({ json: () => manifest });
            fetchMock.mockResolvedValueOnce({
                json: () => ({
                    'test.lib': {
                        dependencies: [{ url: '~url', type: 'UI5LIB', componentId: 'test.lib.component' }]
                    }
                })
            });
            await registerComponentDependencyPaths(['/'], new URLSearchParams());
            expect(loaderMock).toHaveBeenCalledWith({ paths: { 'test/lib/component': '~url' } });
        });

        test('single app, one reuse lib and one componentUsage', async () => {
            const manifest = JSON.parse(JSON.stringify(testManifest)) as typeof testManifest;
            manifest['sap.ui5'].dependencies.libs['test.lib'] = {};
            manifest['sap.ui5'].componentUsages = {
                componentUsage1: {
                    'name': 'test.componentUsage',
                    'lazy': true
                }
            };
            fetchMock.mockResolvedValueOnce({ json: () => manifest });
            fetchMock.mockResolvedValueOnce({
                json: () => ({
                    'test.lib': {
                        dependencies: [{ url: '~url', type: 'UI5LIB', componentId: 'test.lib.component' }]
                    },
                    'test.componentUsage': {
                        dependencies: [{ url: '~url2', type: 'UI5COMP', componentId: 'test.componentUsage' }]
                    }
                })
            });
            await registerComponentDependencyPaths(['/'], new URLSearchParams());
            expect(loaderMock).toHaveBeenCalledWith({ paths: { 'test/lib/component': '~url' } });
        });

        test('registerComponentDependencyPaths: error case', async () => {
            const manifest = JSON.parse(JSON.stringify(testManifest)) as typeof testManifest;
            manifest['sap.ui5'].dependencies.libs['test.lib'] = {};
            fetchMock.mockResolvedValueOnce({ json: () => manifest });
            fetchMock.mockResolvedValueOnce({
                json: () => {
                    throw new Error('Error');
                }
            });
            CommunicationService.sendAction = jest.fn();

            try {
                await registerComponentDependencyPaths(['/'], new URLSearchParams());
            } catch (error) {
                expect(error).toEqual('Error');
            }
        });
    });

    describe('resetAppState', () => {
        let Container: typeof sap.ushell.Container;

        const mockService = {
            deleteAppState: jest.fn()
        };

        beforeEach(() => {
            Container = sap.ushell.Container;
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);
        });

        afterEach(() => {
            jest.clearAllMocks();
            window.location.hash = '';
        });

        test('default', async () => {
            window.location.hash = 'preview-app';
            await resetAppState(Container);
            expect(mockService.deleteAppState).not.toHaveBeenCalled();
        });

        test('hash key equals "/?sap-iapp-state"', async () => {
            window.location.hash = 'preview-app&/?sap-iapp-state=dummyHash1234';
            await resetAppState(Container);
            expect(mockService.deleteAppState).toHaveBeenCalled();
            expect(mockService.deleteAppState).toHaveBeenCalledWith('dummyHash1234');
        });

        test('hash key equals "sap-iapp-state"', async () => {
            window.location.hash = 'preview-app&/?sap-iapp-state-history&sap-iapp-state=dummyHash5678';
            await resetAppState(Container);
            expect(mockService.deleteAppState).toHaveBeenCalled();
            expect(mockService.deleteAppState).toHaveBeenCalledWith('dummyHash5678');
        });
    });

    describe('init', () => {
        const reloadSpy = jest.fn();
        const location = window.location;
        beforeEach(() => {
            sapMock.ushell.Container.attachRendererCreatedEvent.mockReset();
            sapMock.ui.require.mockReset();
            jest.clearAllMocks();

            Object.defineProperty(window, 'location', {
                value: {
                    reload: reloadSpy
                }
            });
        });

        afterEach(() => {
            Object.defineProperty(window, 'location', {
                value: location
            });
        });

        test('nothing configured', async () => {
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.118.1' }]
            });
            CommunicationService.sendAction = jest.fn();
            await init({});
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).not.toHaveBeenCalled();
            expect(sapMock.ushell.Container.createRenderer).toHaveBeenCalledWith(undefined, true);
            expect(sapMock.ushell.Container.createRendererInternal).not.toHaveBeenCalled();
        });

        test('flex configured', async () => {
            const flexSettings = {
                layer: 'CUSTOMER_BASE',
                pluginScript: 'my/script'
            };
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.76.0' }]
            });

            // testing the nested callbacks
            const mockService = {
                attachAppLoaded: jest.fn()
            };
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);
            await init({ flex: JSON.stringify(flexSettings) });

            const rendererCb = sapMock.ushell.Container.attachRendererCreatedEvent.mock
                .calls[0][0] as () => Promise<void>;
            await rendererCb();
            expect(mockService.attachAppLoaded).toHaveBeenCalled();
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).toHaveBeenCalled();
            expect(sapMock.ushell.Container.createRenderer).toHaveBeenCalledWith(undefined, true);

            const loadedCb = mockService.attachAppLoaded.mock.calls[0][0] as (event: unknown) => void;
            loadedCb({ getParameter: () => {} });
            expect(sapMock.ui.require).toHaveBeenCalledWith(
                ['sap/ui/rta/api/startAdaptation', flexSettings.pluginScript],
                expect.anything()
            );
        });

        test('flex configured & ui5 version is 1.71.60', async () => {
            const flexSettings = {
                layer: 'CUSTOMER_BASE',
                pluginScript: 'my/script'
            };
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.71.60' }]
            });

            // testing the nested callbacks
            const mockService = {
                attachAppLoaded: jest.fn()
            };
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);
            await init({ flex: JSON.stringify(flexSettings) });
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).toHaveBeenCalled();
            expect(sapMock.ushell.Container.createRenderer).toHaveBeenCalledWith(undefined, true);

            const rendererCb = sapMock.ushell.Container.attachRendererCreatedEvent.mock
                .calls[0][0] as () => Promise<void>;
            await rendererCb();
            expect(mockService.attachAppLoaded).toHaveBeenCalled();

            const loadedCb = mockService.attachAppLoaded.mock.calls[0][0] as (event: unknown) => void;
            loadedCb({ getParameter: () => {} });
            expect(sapMock.ui.require).toHaveBeenCalledWith(
                ['open/ux/preview/client/flp/initRta', flexSettings.pluginScript],
                expect.anything()
            );

            const requireCb = sapMock.ui.require.mock.calls[0][1] as (
                initRta: InitRtaScript,
                pluginScript?: RTAPlugin
            ) => Promise<void>;
            const initRtaMock = jest.fn();
            const plugnScriptMock = jest.fn();
            await requireCb(initRtaMock, plugnScriptMock);
            expect(initRtaMock).toHaveBeenCalled();
        });

        test('custom init module configured & ui5 version is 1.120.9', async () => {
            const customInit = 'my/app/test/integration/opaTests.qunit';
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.120.9' }]
            });

            await init({ customInit: customInit });

            expect(sapMock.ui.require).toHaveBeenCalledWith([customInit]);
            expect(sapMock.ushell.Container.createRenderer).toHaveBeenCalledWith(undefined, true);
        });

        test('custom init module configured & ui5 version is 2.0.0', async () => {
            const customInit = 'my/app/test/integration/opaTests.qunit';
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '2.0.0' }]
            });

            await init({ customInit: customInit });

            expect(sapMock.ushell.Container.createRendererInternal).toHaveBeenCalledWith(undefined, true);
            expect(sapMock.ushell.Container.createRenderer).not.toHaveBeenCalled();
            expect(sapMock.ui.require).toHaveBeenCalledWith([customInit]);
        });

        test('custom init module configured & ui5 version is legacy-free', async () => {
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.136.0-legacy-free' }]
            });

            await init({});

            expect(sapMock.ushell.Container.createRendererInternal).toHaveBeenCalledWith(undefined, true);
            expect(sapMock.ushell.Container.createRenderer).not.toHaveBeenCalled();
        });

        test('handle higher layer changes', async () => {
            const flexSettings = {
                layer: 'VENDOR',
                pluginScript: 'my/script'
            };

            VersionInfo.load.mockResolvedValueOnce({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.84.50' }]
            });

            const reloadComplete = new Promise((resolve) => {
                // Mocking `sap.ui.require` to throw the correct error structure
                sapMock.ui.require.mockImplementation(async (libs, callback) => {
                    if (libs[0] === 'open/ux/preview/client/flp/WorkspaceConnector') {
                        callback({}); // WorkspaceConnector
                        return;
                    }
                    await callback(() => Promise.reject('Reload triggered'));
                    resolve(undefined);
                });
            });

            CommunicationService.sendAction = jest.fn();

            await init({ flex: JSON.stringify(flexSettings) });
            const rendererCb = sapMock.ushell.Container.attachRendererCreatedEvent.mock
                .calls[0][0] as () => Promise<void>;
            const mockService = {
                attachAppLoaded: jest.fn().mockImplementation((callback) => {
                    callback({ getParameter: jest.fn() });
                })
            };
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);

            await rendererCb();

            // Wait for the reload to complete before continue with the test cases.
            await reloadComplete;

            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'Adaptation Initialization Failed',
                    description: expect.any(String),
                    type: MessageBarType.error
                })
            );
            expect(reloadSpy).toHaveBeenCalled();
        });

        test('cardGenerator mode is enabled', async () => {
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.124.50' }]
            });
            const mockComponentInstance = {} as Component;
            const mockService = {
                attachAppLoaded: jest.fn().mockImplementation((callback: (event: any) => void) => {
                    const mockEvent = {
                        getParameter: jest.fn().mockReturnValue(mockComponentInstance)
                    };
                    callback(mockEvent);
                }),
                createUserAction: jest.fn()
            };
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);
            await init({ enableCardGenerator: true });

            const rendererCb = sapMock.ushell.Container.attachRendererCreatedEvent.mock
                .calls[0][0] as () => Promise<void>;
            await rendererCb();
            expect(mockService.attachAppLoaded).toHaveBeenCalled();
            expect(mockService.attachAppLoaded).toHaveBeenCalledTimes(1);
            expect(mockService.attachAppLoaded.mock.calls[0][0]).toBeInstanceOf(Function);
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).toHaveBeenCalled();
            expect(sapMock.ushell.Container.createRenderer).toHaveBeenCalledWith(undefined, true);
        });

        test('enhancedHomePage mode is enabled', async () => {
            VersionInfo.load.mockResolvedValue({
                name: 'SAPUI5 Distribution',
                libraries: [{ name: 'sap.ui.core', version: '1.106.0' }]
            });
            await init({ enhancedHomePage: true });

            expect((window as unknown as Window)['sap-ushell-config']).toMatchSnapshot();
            expect(sapMock.ushell.Container.init).toHaveBeenCalledWith('cdm');
        });
    });
});
