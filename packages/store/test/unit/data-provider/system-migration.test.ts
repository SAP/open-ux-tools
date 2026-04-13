import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';

const mockFsStore = {
    write: jest.fn(),
    read: jest.fn(),
    del: jest.fn(),
    getAll: jest.fn(),
    readAll: jest.fn(),
    partialUpdate: jest.fn()
};

jest.unstable_mockModule('../../../src/data-access/filesystem', () => ({
    getFilesystemStore: jest.fn().mockReturnValue(mockFsStore),
    basedir: jest.fn(),
    getFilesystemWatcherFor: jest.fn()
}));

const { SystemMigrationStatusDataProvider } = await import('../../../src/data-provider/system-migration');
const { SystemMigrationStatus, SystemMigrationStatusKey } =
    await import('../../../src/entities/system-migration-status');
const { Entities } = await import('../../../src/data-provider/constants');
const { NullTransport, ToolsLogger: ToolsLoggerClass } = await import('@sap-ux/logger');

describe('System migration data provider', () => {
    const logger = new ToolsLoggerClass({ transports: [new NullTransport()] });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('read delegates to data accessor', async () => {
        const migrationStatus: InstanceType<typeof SystemMigrationStatus> = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        mockFsStore.read.mockResolvedValueOnce(migrationStatus);

        await expect(new SystemMigrationStatusDataProvider(logger).read(new SystemMigrationStatusKey())).resolves.toBe(
            migrationStatus
        );
        expect(mockFsStore.read).toHaveBeenCalledWith({
            entityName: Entities.SystemMigrationStatus,
            id: new SystemMigrationStatusKey().getId()
        });
    });

    it('write delegates to data accessor', async () => {
        const migrationStatus: InstanceType<typeof SystemMigrationStatus> = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        mockFsStore.write.mockResolvedValueOnce(migrationStatus);
        await expect(
            new SystemMigrationStatusDataProvider(logger).write(new SystemMigrationStatus(migrationStatus))
        ).resolves.toBe(migrationStatus);
        expect(mockFsStore.write).toHaveBeenCalledWith({
            entityName: Entities.SystemMigrationStatus,
            id: new SystemMigrationStatusKey().getId(),
            entity: new SystemMigrationStatus(migrationStatus)
        });
    });

    it('delete delegates to data accessor', async () => {
        const migrationStatus: InstanceType<typeof SystemMigrationStatus> = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        mockFsStore.del.mockResolvedValueOnce(true);
        await expect(
            new SystemMigrationStatusDataProvider(logger).delete(new SystemMigrationStatus(migrationStatus))
        ).resolves.toBe(true);
        expect(mockFsStore.del).toHaveBeenCalledWith({
            entityName: Entities.SystemMigrationStatus,
            id: new SystemMigrationStatusKey().getId()
        });
    });

    it('getAll delegates to data accessor', async () => {
        const migrationStatus: InstanceType<typeof SystemMigrationStatus> = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        mockFsStore.getAll.mockResolvedValueOnce([new SystemMigrationStatus(migrationStatus)]);
        await expect(new SystemMigrationStatusDataProvider(logger).getAll()).resolves.toEqual([
            new SystemMigrationStatus(migrationStatus)
        ]);
        expect(mockFsStore.getAll).toHaveBeenCalledWith({
            entityName: Entities.SystemMigrationStatus
        });
    });
});
