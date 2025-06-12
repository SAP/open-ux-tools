import { sapMock } from 'mock/window';
import { Window } from 'types/global';
import initCdm from '../../../src/flp/initCdm';

describe('flp/initCdm', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        sapMock.ui.require.mockReset();
    });

    test('ensure that ushell config is set properly', async () => {
        initCdm();

        expect((window as unknown as Window)['sap-ushell-config']).toMatchSnapshot();
    });

    test('ensure that homepage component is defined', async () => {
        expect(await import('../../../src/flp/homepage/Component')).toBeDefined();
    });
});
