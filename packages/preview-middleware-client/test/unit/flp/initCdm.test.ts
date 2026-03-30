import { sapMock, documentMock } from 'mock/window';
import { Window } from 'types/global';

describe('flp/initCdm', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        sapMock.ui.require.mockReset();
        documentMock.getElementById.mockReset();
    });

    test('ensure that ushell config is set properly', async () => {
        await import('../../../src/flp/initCdm');

        expect((window as unknown as Window)['sap-ushell-config']).toMatchSnapshot();
    });

    test('ensure that base path is picked up from data attribute', async () => {
        const scriptElement = document.createElement('script');
        scriptElement.id = 'init-cdm';
        scriptElement.dataset.basePath = '/myapp';
        documentMock.getElementById.mockReturnValue(scriptElement);

        await import('../../../src/flp/initCdm');

        const config = (window as unknown as Window)['sap-ushell-config'] as Record<string, unknown>;
        expect((config['ushell'] as any).homeApp.component.url).toBe('/myapp/preview/client/flp/homepage');
    });

    test('ensure that homepage component is defined', async () => {
        expect(await import('../../../src/flp/homepage/Component')).toBeDefined();
    });
});
