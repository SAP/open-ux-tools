import { sapMock } from 'mock/window';
import { Window } from 'types/global';
import initCdm from '../../../src/flp/initCdm';

describe('flp/initCdm', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        sapMock.ui.require.mockReset();
    });

    test('ensure that ushell config is set properly', async () => {
        const container = sapMock.ushell.Container;
        await initCdm(container as unknown as typeof sap.ushell.Container);

        expect((window as unknown as Window)['sap-ushell-config']).toMatchSnapshot();
        expect(sapMock.ushell.Container.init).toHaveBeenCalledWith('cdm');
    });

    test('ensure that homepage component is defined', async () => {
        expect(await import('../../../src/flp/homepage/Component')).toBeDefined();
    });
});
