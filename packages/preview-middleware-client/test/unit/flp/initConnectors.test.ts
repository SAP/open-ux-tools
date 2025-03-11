import { sapMock } from 'mock/window';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import initConnectors from '../../../src/flp/initConnectors';

describe('flp/initConnectors', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        sapMock.ui.require.mockReset();
    });

    test('enables fake lrep connector when ui5 version is 1.71', async () => {
        sapMock.ui.version = '1.71.60';
        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.71.60' });
        await initConnectors();

        expect(sapMock.ui.require).toBeCalledWith(
            ['open/ux/preview/client/flp/enableFakeConnector'],
            expect.anything()
        );

        expect(sapMock.ui.require).not.toBeCalledWith(
            ['open/ux/preview/client/flp/WorkspaceConnector'],
            expect.anything()
        );

        const enableFakeConSpy = jest.fn();
        const requireCb = sapMock.ui.require.mock.calls[0][1] as (enableFakeConnector: () => void) => void;

        requireCb(enableFakeConSpy);
        expect(enableFakeConSpy).toHaveBeenCalled();
    });
});
