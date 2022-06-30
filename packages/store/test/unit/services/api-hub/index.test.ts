import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { ApiHubSettingsService } from '../../../../src/services';
import * as migration from '../../../../src/services/api-hub/migration';
jest.mock('../../../../src/secure-store');
jest.mock('../../../../src/data-provider/api-hub');

describe('api-hub service', () => {
    describe('migration', () => {
        const migrateToLatestVersionSpy = jest.spyOn(migration, 'migrateToLatestVersion');
        const logger = new ToolsLogger({ transports: [new NullTransport()] });

        beforeEach(() => {
            jest.clearAllMocks();
            migrateToLatestVersionSpy.mockImplementation(() => {
                return Promise.resolve();
            });
        });

        it('is called before read', async () => {
            await new ApiHubSettingsService(logger).read();
            expect(migrateToLatestVersionSpy).toBeCalledTimes(1);
        });

        it('is called before write', async () => {
            await new ApiHubSettingsService(logger).write({ apiKey: 'dummyKey' });
            expect(migrateToLatestVersionSpy).toBeCalledTimes(1);
        });

        it('is called before delete', async () => {
            await new ApiHubSettingsService(logger).delete({ apiKey: 'dummyKey' });
            expect(migrateToLatestVersionSpy).toBeCalledTimes(1);
        });

        it('is called before getAll', async () => {
            await new ApiHubSettingsService(logger).getAll();
            expect(migrateToLatestVersionSpy).toBeCalledTimes(1);
        });

        it('is called before partialUpdate', async () => {
            await expect(new ApiHubSettingsService(logger).partialUpdate()).rejects.toThrowError();
            expect(migrateToLatestVersionSpy).toBeCalledTimes(1);
        });
    });
});
