import ObjectStorageConnector from 'mock/sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import connectorPromise from '../../../src/flp/WorkspaceConnector';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import * as additionalChangeInfo from '../../../src/utils/additional-change-info';

import { documentMock, fetchMock } from 'mock/window';

describe('flp/WorkspaceConnector', () => {
    jest.spyOn(additionalChangeInfo, 'getAdditionalChangeInfo').mockReturnValue(undefined);
    test('layers', async () => {
        const connector = await connectorPromise;
        expect(connector.layers).toEqual(['VENDOR', 'CUSTOMER_BASE']);
    });

    describe('storage', () => {
        beforeAll(() => {
            fetchMock.mockResolvedValue({});
        });

        test('setItem', async () => {
            jest.spyOn(additionalChangeInfo, 'getAdditionalChangeInfo').mockReturnValueOnce({
                templateName: 'templateName'
            });
            const connector = await connectorPromise;
            connector.storage.fileChangeRequestNotifier = jest.fn();
            const change = { data: '~Data' };
            await connector.storage.setItem('~notUsed', change);

            const body = {
                change: {
                    ...change
                },
                additionalChangeInfo: { templateName: 'templateName' }
            };

            expect(fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(body, null, 2)
                })
            );
            expect(connector.storage.fileChangeRequestNotifier).toHaveBeenCalledTimes(0);
        });

        test('setItem (fileChange)', async () => {
            const connector = await connectorPromise;
            connector.storage.fileChangeRequestNotifier = jest.fn();
            const change = { data: '~Data', fileName: 'dummyFile', changeType: 'property' };
            await connector.storage.setItem('~notUsed', change);

            expect(fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ change: { ...change } }, null, 2)
                })
            );
            expect(connector.storage.fileChangeRequestNotifier).toHaveBeenCalledWith(
                'dummyFile',
                'create',
                change,
                undefined
            );
        });

        test('setItem, generator - tool-variant', async () => {
            const change = { data: '~Data' };
            documentMock.getElementById.mockReturnValueOnce({
                getAttribute: () => JSON.stringify({ generator: 'tool-variant' })
            });

            const connector = await connectorPromise;
            await connector.storage.setItem('~notUsed', change);
            expect((change as any).support.generator).toBe('tool-variant');
        });

        test('removeItem', async () => {
            const connector = await connectorPromise;
            connector.storage.fileChangeRequestNotifier = jest.fn();
            const key = '~Key';
            await connector.storage.removeItem(key);

            expect(fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    method: 'DELETE',
                    body: JSON.stringify({ fileName: key })
                })
            );
            expect(connector.storage.fileChangeRequestNotifier).toHaveBeenCalledWith(key, 'delete');
        });

        test('getItems', async () => {
            const mockResponse = [
                { id: 1, data: 'item1' },
                { id: 2, data: 'item2' }
            ];
            fetchMock.mockResolvedValueOnce({
                json: async () => mockResponse
            });

            const connector = await connectorPromise;
            const result = await connector.storage.getItems();

            expect(fetch).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    method: 'GET'
                })
            );
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
            VersionInfo.load.mockResolvedValueOnce({ name: 'sap.ui.core', version: '1.118.1' });
            const connector = await connectorPromise;
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(true);
        });

        test('version < 1.90', async () => {
            jest.resetModules();
            const VersionInfo = (await import('mock/sap/ui/VersionInfo')).default;
            VersionInfo.load.mockResolvedValueOnce({ name: 'sap.ui.core', version: '1.89.3' });
            const ObjectStorageConnector = (await import('mock/sap/ui/fl/write/api/connectors/ObjectStorageConnector')).default;
            ObjectStorageConnector.loadFeatures.mockResolvedValue({ isVariantAdaptationEnabled: false });
            const connectorPromise = (await import('../../../src/flp/WorkspaceConnector')).default;
            const connector = await connectorPromise;
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(false);
        });

        test('version >= 1.90, developerMode=true', async () => {
            VersionInfo.load.mockResolvedValueOnce({ name: 'sap.ui.core', version: '1.118.1' });
            documentMock.getElementById.mockReturnValueOnce({
                getAttribute: () => JSON.stringify({ developerMode: true })
            });
            const connector = await connectorPromise;
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(false);
        });

        test('scenario=ADAPTATION_PROJECT', async () => {
            VersionInfo.load.mockResolvedValueOnce({ name: 'sap.ui.core', version: '1.118.1' });
            documentMock.getElementById.mockReturnValueOnce({
                getAttribute: () => JSON.stringify({ scenario: 'ADAPTATION_PROJECT' })
            });
            const connector = await connectorPromise;
            const features = await connector.loadFeatures();
            expect(features.isVariantAdaptationEnabled).toBe(true);
        });
    });
});
