import { init, registerComponentDependencyPaths, registerSAPFonts, setI18nTitle } from '../../../src/flp/init';
import IconPoolMock from 'mock/sap/ui/core/IconPool';
import { mockBundle } from 'mock/sap/base/i18n/ResourceBundle';
import { fetchMock, sapMock } from 'mock/window';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';

describe('flp/init', () => {
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
            await registerComponentDependencyPaths(['/']);
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
            await registerComponentDependencyPaths(['/']);
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
                await registerComponentDependencyPaths(['/']);
            } catch (error) {
                expect(error).toEqual('Error');
            }
        });
    });

    describe('init', () => {
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

            expect(sapMock.ui.require).toBeCalledWith(customInit);

            expect(sapMock.ushell.Container.createRenderer).toBeCalledWith(undefined, true);
        });
    });
});
