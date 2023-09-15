import ObjectStorageConnector from 'mock/sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import connector from '../../../src/flp/WorkspaceConnector';
import VersionInfo from 'mock/sap/ui/VersionInfo';

describe('flp/WorkspaceConnector', () => {
    test('layers', () => {
        expect(connector.layers).toEqual(['VENDOR','CUSTOMER_BASE']);
    });
    describe('storage', () => {
        test.todo('storage.setItem');
        test.todo('storage.removeItem');
        test.todo('storage.getItems');
    });
    describe('loadFeatures', () => {
        ObjectStorageConnector.loadFeatures.mockResolvedValue({
            isVariantAdaptationEnabled: false
        });
        test('version >= 1.90, no developerMode', async () => {
            VersionInfo.load.mockResolvedValueOnce({ version: '1.118.1'});
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(true);
        });
        test.todo('version < 1.90');
        //test('version < 1.90', async () => {
        //    VersionInfo.load.mockResolvedValueOnce({ version: '1.89.3'});
        //    const features = await connector.loadFeatures();
        //    expect(features.isVariantAdaptationEnabled).toBe(false);
        //});
        test.todo('developerMode=true');
    });
});