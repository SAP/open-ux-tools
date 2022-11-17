import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import type { DataProvider } from '../../../../src/data-provider';
import type { ApiHubSettings, ApiHubSettingsKey } from '../../../../src';
import {
    LEGACY_API_HUB_API_KEY,
    LEGACY_API_HUB_API_SERVICE,
    migrateToLatestVersion
} from '../../../../src/services/api-hub/migration';
import type { SecureStore } from '../../../../src/secure-store';

describe('migration', () => {
    describe('migrateToLatestVersion', () => {
        const mockSecureStore: jest.Mocked<SecureStore> = {
            save: jest.fn(),
            retrieve: jest.fn(),
            'delete': jest.fn(),
            getAll: jest.fn()
        };

        const mockDataProvider: jest.Mocked<DataProvider<ApiHubSettings, ApiHubSettingsKey>> = {
            read: jest.fn(),
            write: jest.fn(),
            'delete': jest.fn(),
            getAll: jest.fn()
        };

        const logger = new ToolsLogger({ transports: [new NullTransport()] });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('does nothing if legacy key not found', async () => {
            mockSecureStore.retrieve.mockResolvedValueOnce(undefined);

            await migrateToLatestVersion({ secureStore: mockSecureStore, logger, dataProvider: mockDataProvider });

            expect(mockDataProvider.write).not.toBeCalled();
            expect(mockSecureStore.delete).not.toBeCalled();
        });

        test('just deletes the legacy key if key in new format found', async () => {
            mockSecureStore.retrieve.mockResolvedValueOnce('dummyKey');
            mockDataProvider.read.mockResolvedValueOnce({ apiKey: 'dummyKey' });

            await migrateToLatestVersion({ secureStore: mockSecureStore, logger, dataProvider: mockDataProvider });

            expect(mockDataProvider.write).not.toBeCalled();
            expect(mockSecureStore.delete).toBeCalledTimes(1);
            expect(mockSecureStore.delete).toBeCalledWith(LEGACY_API_HUB_API_SERVICE, LEGACY_API_HUB_API_KEY);
        });

        test('migrates to new format if legacy format found and no data found in new format', async () => {
            const API_KEY = 'dummyKey';
            mockSecureStore.retrieve.mockResolvedValueOnce(API_KEY);
            mockDataProvider.getAll.mockResolvedValueOnce(undefined);

            await migrateToLatestVersion({ secureStore: mockSecureStore, logger, dataProvider: mockDataProvider });

            expect(mockDataProvider.write).toBeCalledTimes(1);
            expect(mockDataProvider.write).toBeCalledWith(expect.objectContaining({ apiKey: API_KEY }));
            expect(mockSecureStore.delete).toBeCalledTimes(1);
            expect(mockSecureStore.delete).toBeCalledWith(LEGACY_API_HUB_API_SERVICE, LEGACY_API_HUB_API_KEY);
        });
    });
});
