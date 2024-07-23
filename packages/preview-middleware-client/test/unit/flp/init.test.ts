import {
    init,
    registerComponentDependencyPaths,
    registerSAPFonts,
    setI18nTitle,
    resetAppState,
    loadI18nResourceBundle
} from '../../../src/flp/init';
import IconPoolMock from 'mock/sap/ui/core/IconPool';
import { default as mockBundle } from 'mock/sap/base/i18n/ResourceBundle';
import * as apiHandler from '../../../src/adp/api-handler';
import { fetchMock, sapMock } from 'mock/window';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';
import type { Scenario } from '@sap-ux-private/control-property-editor-common';
import VersionInfo from 'mock/sap/ui/VersionInfo';

describe('flp/init', () => {
    test('registerSAPFonts', () => {
        registerSAPFonts();
        expect(IconPoolMock.registerFont).toBeCalledTimes(2);
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
        expect(mockBundle.create).toBeCalledWith({
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
        expect(mockBundle.create).toBeCalledWith({
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
                }
            }
        };

        beforeEach(() => {
            loaderMock.mockReset();
        });

        test('single app, no reuse libs', async () => {
            fetchMock.mockResolvedValueOnce({ json: () => testManifest });
            await registerComponentDependencyPaths(['/'], new URLSearchParams());
            expect(loaderMock).not.toBeCalled();
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
            expect(loaderMock).toBeCalledWith({ paths: { 'test/lib/component': '~url' } });
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
            expect(mockService.deleteAppState).not.toBeCalled();
        });

        test('hash key equals "/?sap-iapp-state"', async () => {
            window.location.hash = 'preview-app&/?sap-iapp-state=dummyHash1234';
            await resetAppState(Container);
            expect(mockService.deleteAppState).toBeCalled();
            expect(mockService.deleteAppState).toBeCalledWith('dummyHash1234');
        });

        test('hash key equals "sap-iapp-state"', async () => {
            window.location.hash = 'preview-app&/?sap-iapp-state-history&sap-iapp-state=dummyHash5678';
            await resetAppState(Container);
            expect(mockService.deleteAppState).toBeCalled();
            expect(mockService.deleteAppState).toBeCalledWith('dummyHash5678');
        });
    });

    describe('init', () => {
        beforeEach(() => {
            sapMock.ushell.Container.attachRendererCreatedEvent.mockReset();
            sapMock.ui.require.mockReset();
            jest.clearAllMocks();
        });

        test('nothing configured', async () => {
            VersionInfo.load.mockResolvedValue({ version: '1.118.1' });
            await init({});
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).not.toBeCalled();
            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
            expect(sapMock.ushell.Container.getServiceAsync).toBeCalledWith('AppState');
        });

        test('flex configured', async () => {
            const flexSettings = {
                layer: 'CUSTOMER_BASE',
                pluginScript: 'my/script'
            };
            VersionInfo.load.mockResolvedValue({ version: '1.84.50' });
            await init({ flex: JSON.stringify(flexSettings) });
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).toBeCalled();
            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
            const rendererCb = sapMock.ushell.Container.attachRendererCreatedEvent.mock
                .calls[0][0] as () => Promise<void>;

            // testing the nested callbacks
            const mockService = {
                attachAppLoaded: jest.fn()
            };
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);

            await rendererCb();
            expect(mockService.attachAppLoaded).toBeCalled();
            const loadedCb = mockService.attachAppLoaded.mock.calls[0][0] as (event: unknown) => void;

            loadedCb({ getParameter: () => {} });
            expect(sapMock.ui.require).toBeCalledWith(
                ['sap/ui/rta/api/startAdaptation', flexSettings.pluginScript],
                expect.anything()
            );

            const requireCb = sapMock.ui.require.mock.calls[0][1] as (
                startAdaptation: StartAdaptation,
                pluginScript?: RTAPlugin
            ) => void;
            const startAdpMock = jest.fn();
            const plugnScriptMock = jest.fn();
            requireCb(startAdpMock, plugnScriptMock);
            expect(startAdpMock).toBeCalledWith(expect.anything(), plugnScriptMock);
        });

        test('flex configured & ui5 version is 1.71.60', async () => {
            const flexSettings = {
                layer: 'CUSTOMER_BASE',
                pluginScript: 'my/script'
            };
            VersionInfo.load.mockResolvedValue({ version: '1.71.60' });
            await init({ flex: JSON.stringify(flexSettings) });
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).toBeCalled();
            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
            const rendererCb = sapMock.ushell.Container.attachRendererCreatedEvent.mock
                .calls[0][0] as () => Promise<void>;

            // testing the nested callbacks
            const mockService = {
                attachAppLoaded: jest.fn()
            };
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);

            await rendererCb();
            expect(mockService.attachAppLoaded).toBeCalled();
            const loadedCb = mockService.attachAppLoaded.mock.calls[0][0] as (event: unknown) => void;

            loadedCb({ getParameter: () => {} });
            expect(sapMock.ui.require).toBeCalledWith(
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
            expect(initRtaMock).toBeCalledWith(expect.anything(), plugnScriptMock);
        });

        test('custom init module configured & ui5 version is 1.120.9', async () => {
            const customInit = 'my/app/test/integration/opaTests.qunit';
            VersionInfo.load.mockResolvedValue({ version: '1.120.9' });

            await init({ customInit: customInit });

            expect(sapMock.ui.require).toBeCalledWith([customInit]);
            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
        });

        test('custom init module configured & ui5 version is 2.0.0', async () => {
            const customInit = 'my/app/test/integration/opaTests.qunit';
            VersionInfo.load.mockResolvedValue({ version: '2.0.0' });

            await init({ customInit: customInit });

            expect(sapMock.ui.require).toBeCalledWith([customInit]);
            expect(sapMock.ushell.Container.createRendererInternal).toBeCalledWith(undefined, true);
        });
    });
});
