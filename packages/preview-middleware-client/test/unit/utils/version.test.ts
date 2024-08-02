import {getUi5Version} from 'open/ux/preview/client/utils/version';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import {SingleVersionInfo} from '../../../types/global';

describe('utils/version', () => {
    test('getUi5Version', async () => {
        jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.124.0'
        } as SingleVersionInfo);
        const version = await getUi5Version();
        expect(version).toEqual('1.124.0');
    });
    test('getUi5Version fallback to 1.121.0', async () => {
        const version = await getUi5Version();
        expect(version).toEqual('1.121.0');
    });
})