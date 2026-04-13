import { jest } from '@jest/globals';
import type { DataProvider } from '../../../../src/data-provider';
import type { ApiHubSettings, ApiHubSettingsKey } from '../../../../src';
import type { SecureStore } from '../../../../src/secure-store';

const { LEGACY_API_HUB_API_KEY, LEGACY_API_HUB_API_SERVICE, migrateToLatestVersion } =
    await import('../../../../src/services/api-hub/migration');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

type MockedSecureStore = { [K in keyof SecureStore]: ReturnType<typeof jest.fn> };
type MockedDataProvider = { [K in keyof DataProvider<ApiHubSettings, ApiHubSettingsKey>]: ReturnType<typeof jest.fn> };

describe('migration', () => {
    describe('migrateToLatestVersion', () => {
        const mockSecureStore: MockedSecureStore = {
            save: jest.fn(),
            retrieve: jest.fn(),
            'delete': jest.fn(),
            getAll: jest.fn()
        };

        const mockDataProvider: MockedDataProvider = {
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

            expect(mockDataProvider.write).not.toHaveBeenCalled();
            expect(mockSecureStore.delete).not.toHaveBeenCalled();
        });

        test('just deletes the legacy key if key in new format found', async () => {
            mockSecureStore.retrieve.mockResolvedValueOnce('dummyKey');
            mockDataProvider.read.mockResolvedValueOnce({ apiKey: 'dummyKey' });

            await migrateToLatestVersion({ secureStore: mockSecureStore, logger, dataProvider: mockDataProvider });

            expect(mockDataProvider.write).not.toHaveBeenCalled();
            expect(mockSecureStore.delete).toHaveBeenCalledTimes(1);
            expect(mockSecureStore.delete).toHaveBeenCalledWith(LEGACY_API_HUB_API_SERVICE, LEGACY_API_HUB_API_KEY);
        });

        test('migrates to new format if legacy format found and no data found in new format', async () => {
            const API_KEY = 'dummyKey';
            mockSecureStore.retrieve.mockResolvedValueOnce(API_KEY);
            mockDataProvider.getAll.mockResolvedValueOnce(undefined);

            await migrateToLatestVersion({ secureStore: mockSecureStore, logger, dataProvider: mockDataProvider });

            expect(mockDataProvider.write).toHaveBeenCalledTimes(1);
            expect(mockDataProvider.write).toHaveBeenCalledWith(expect.objectContaining({ apiKey: API_KEY }));
            expect(mockSecureStore.delete).toHaveBeenCalledTimes(1);
            expect(mockSecureStore.delete).toHaveBeenCalledWith(LEGACY_API_HUB_API_SERVICE, LEGACY_API_HUB_API_KEY);
        });
    });
});
