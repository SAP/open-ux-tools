import { jest } from '@jest/globals';

const mockMigrateToLatestVersion = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.unstable_mockModule('../../../../src/secure-store', () => ({
    getSecureStore: jest.fn()
}));

jest.unstable_mockModule('../../../../src/data-provider/api-hub', () => ({
    ApiHubSettingsProvider: jest.fn().mockImplementation(() => ({
        read: jest.fn(),
        write: jest.fn(),
        delete: jest.fn(),
        getAll: jest.fn()
    }))
}));

jest.unstable_mockModule('../../../../src/services/api-hub/migration', () => ({
    migrateToLatestVersion: mockMigrateToLatestVersion,
    LEGACY_API_HUB_API_KEY: 'legacy-key',
    LEGACY_API_HUB_API_SERVICE: 'legacy-service'
}));

const { ApiHubSettingsService } = await import('../../../../src/services/api-hub/service');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('api-hub service', () => {
    describe('migration', () => {
        const logger = new ToolsLogger({ transports: [new NullTransport()] });

        beforeEach(() => {
            jest.clearAllMocks();
            mockMigrateToLatestVersion.mockResolvedValue(undefined);
        });

        it('is called before read', async () => {
            await new ApiHubSettingsService(logger).read();
            expect(mockMigrateToLatestVersion).toHaveBeenCalledTimes(1);
        });

        it('is called before write', async () => {
            await new ApiHubSettingsService(logger).write({ apiKey: 'dummyKey' });
            expect(mockMigrateToLatestVersion).toHaveBeenCalledTimes(1);
        });

        it('is called before delete', async () => {
            await new ApiHubSettingsService(logger).delete({ apiKey: 'dummyKey' });
            expect(mockMigrateToLatestVersion).toHaveBeenCalledTimes(1);
        });

        it('is called before getAll', async () => {
            await new ApiHubSettingsService(logger).getAll();
            expect(mockMigrateToLatestVersion).toHaveBeenCalledTimes(1);
        });

        it('is called before partialUpdate', async () => {
            await expect(new ApiHubSettingsService(logger).partialUpdate()).rejects.toThrow();
            expect(mockMigrateToLatestVersion).toHaveBeenCalledTimes(1);
        });
    });
});
