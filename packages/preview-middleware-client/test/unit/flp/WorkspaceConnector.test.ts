import ObjectStorageConnector from 'mock/sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import connector from '../../../src/flp/WorkspaceConnector';
import VersionInfo from 'mock/sap/ui/VersionInfo';

import { documentMock, fetchMock } from 'mock/window';

describe('flp/WorkspaceConnector', () => {
    test('layers', () => {
        expect(connector.layers).toEqual(['VENDOR', 'CUSTOMER_BASE']);
    });

    describe('storage', () => {
        beforeAll(() => {
            fetchMock.mockResolvedValue({});
        });

        test('setItem', async () => {
            const change = { data: '~Data' };
            await connector.storage.setItem('~notUsed', change);

            expect(fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(change, null, 2)
            }));
        });

        test('setItem, generator - tool-variant', async () => {
            const change = { data: '~Data' };
            documentMock.getElementById.mockReturnValueOnce({
                getAttribute: () => JSON.stringify({ generator: 'tool-variant' })
            })

            await connector.storage.setItem('~notUsed', change);
            expect((change as any).support.generator).toBe('tool-variant');
        });

        test('removeItem', async () => {
            const key = '~Key';
            await connector.storage.removeItem(key);

            expect(fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                method: 'DELETE',
                body: JSON.stringify({ fileName: key })
            }));
        });

        test('getItems', async () => {
            const mockResponse = [{ id: 1, data: 'item1' }, { id: 2, data: 'item2' }];
            fetchMock.mockResolvedValueOnce({
                json: async () => mockResponse,
            });

            const result = await connector.storage.getItems();

            expect(fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                method: 'GET'
            }));
            expect(result).toEqual(mockResponse);
        });
    });
    describe('loadFeatures', () => {
        beforeAll(() => {
            ObjectStorageConnector.loadFeatures.mockResolvedValue({
                isVariantAdaptationEnabled: false
            });    
        });

        test('version >= 1.90, no developerMode', async () => {
            VersionInfo.load.mockResolvedValueOnce({ version: '1.118.1' });
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(true);
        });

        test('version < 1.90', async () => {
            VersionInfo.load.mockResolvedValueOnce({ version: '1.89.3'});
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(false);
        });

        test('version >= 1.90, developerMode=true', async () => {
            VersionInfo.load.mockResolvedValueOnce({ version: '1.118.1' });
            documentMock.getElementById.mockReturnValueOnce({
                getAttribute: () => JSON.stringify({ developerMode: true })
            })
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(false);
        });
    });
});