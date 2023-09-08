import { configure, init, registerComponentDependencyPaths, registerSAPFonts, setI18nTitle } from '../../../src/flp/init';
import IconPoolMock from 'mock/sap/ui/core/IconPool';
import { mockBundle } from 'mock/sap/base/i18n/ResourceBundle';
import { fetchMock } from 'mock/window';

describe('flp/init', () => {
    test('registerSAPFonts', () => {
        registerSAPFonts();
        expect(IconPoolMock.registerFont).toBeCalledTimes(2);
    });

    test('setI18nTitle', () => {
        const title = '~testTitle';
        mockBundle.getText.mockReturnValue(title);
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
    });

    describe('configure', () => {
        const attachMock = sap.ushell.Container.attachRendererCreatedEvent as jest.Mock;
        beforeEach(() => {
            attachMock.mockReset();
        });

        test('nothing configured', async () => {
            await configure({});
            expect(attachMock).not.toBeCalled();
        });

        test('flex configured', async () => {
            await configure({
                flex: JSON.stringify({
                    layer: 'CUSTOMER_BASE'
                })
            });
            expect(attachMock).toBeCalled();
        });
    });

    test('init', () => {
        init();
        expect(sap.ushell.Container.createRenderer).toBeCalled();
    });
});
