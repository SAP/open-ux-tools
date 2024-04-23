// import * as initBundle from '../../../src/flp/init';
import {
    init,
    registerComponentDependencyPaths,
    registerSAPFonts,
    setI18nTitle,
    resetAppState
} from '../../../src/flp/init';
import IconPoolMock from 'mock/sap/ui/core/IconPool';
import { mockBundle } from 'mock/sap/base/i18n/ResourceBundle';
import { fetchMock, sapMock } from 'mock/window';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';

describe('flp/init', () => {
    let windowSpy: jest.SpyInstance;

    test('registerSAPFonts', () => {
        registerSAPFonts();
        expect(IconPoolMock.registerFont).toBeCalledTimes(2);
    });

    test('setI18nTitle', () => {
        const title = '~testTitle';
        mockBundle.getText.mockReturnValue(title);

        mockBundle.hasText.mockReturnValueOnce(true);
        setI18nTitle();
        expect(document.title).toBe(title);

        mockBundle.hasText.mockReturnValueOnce(false);
        setI18nTitle();
        expect(document.title).toBe(title);
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
            windowSpy = jest.spyOn(globalThis, 'window', 'get');
            Container = sap.ushell.Container;
            sapMock.ushell.Container.getServiceAsync.mockResolvedValueOnce(mockService);
        });

        afterEach(() => {
            windowSpy.mockRestore();
            jest.clearAllMocks();
        });

        test('default', async () => {
            windowSpy.mockImplementation(() => ({
                location: {
                    hash: ''
                }
            }));
            await resetAppState(Container);
            expect(mockService.deleteAppState).not.toBeCalled();
        });

        test('hash key equals "/?sap-iapp-state"', async () => {
            windowSpy.mockImplementation(() => ({
                location: {
                    hash: '/?sap-iapp-state=dummyHash1234'
                }
            }));

            await resetAppState(Container);
            expect(mockService.deleteAppState).toBeCalled();
            expect(mockService.deleteAppState.mock.calls[0][0]).toEqual('dummyHash1234');
        });

        test('hash key equals "sap-iapp-state"', async () => {
            windowSpy.mockImplementation(() => ({
                location: {
                    hash: 'sap-iapp-state=dummyHash5678'
                }
            }));
            await resetAppState(Container);
            expect(mockService.deleteAppState).toBeCalled();
            expect(mockService.deleteAppState.mock.calls[0][0]).toEqual('dummyHash5678');
        });
    });

    describe('init', () => {

        describe.skip('param fiori-tools-iapp-state', () => {
            // let resetAppStateSpy: jest.SpyInstance;
            //     resetAppStateSpy = jest
            //         .spyOn(initBundle, 'resetAppState')
            //         .mockImplementationOnce(() => Promise.resolve(true));
            // resetAppStateSpy.mockReset();

            const resetAppStateMock = jest.fn();

            jest.mock('../../../src/flp/init', () => ({
                ...jest.requireActual('../../../src/flp/init'),
                resetAppState: resetAppStateMock
            }));

            beforeEach(() => {
                windowSpy = jest.spyOn(globalThis, 'window', 'get');
            });
            afterEach(() => {
                windowSpy.mockRestore();
                jest.clearAllMocks();
            });

            test('fiori-tools-iapp-state configured to "true"', async () => {
                windowSpy.mockImplementation(() => ({
                    location: {
                        search: `fiori-tools-iapp-state='true'`
                    }
                }));
                await init({});
                expect(resetAppStateMock).not.toHaveBeenCalled();
            });

            test('fiori-tools-iapp-state configured to "false"', async () => {
                windowSpy.mockImplementation(() => ({
                    location: {
                        search: `fiori-tools-iapp-state='chicken'`
                    }
                }));
                await init({});
                expect(resetAppStateMock).toHaveBeenCalled();
            });
        });

        beforeEach(() => {
            sapMock.ushell.Container.attachRendererCreatedEvent.mockReset();
            sapMock.ui.require.mockReset();
        });

        test('nothing configured', async () => {
            await init({});
            expect(sapMock.ushell.Container.attachRendererCreatedEvent).not.toBeCalled();
            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
        });

        test('flex configured', async () => {
            const flexSettings = {
                layer: 'CUSTOMER_BASE',
                pluginScript: 'my/script'
            };
            sapMock.ui.version = '1.84.50';
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
            sapMock.ui.version = '1.71.60';
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
            sapMock.ui.version = '1.120.09';
            await init({ customInit: customInit });

            expect(sapMock.ui.require).toBeCalledWith([customInit]);

            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
        });
    });
});
