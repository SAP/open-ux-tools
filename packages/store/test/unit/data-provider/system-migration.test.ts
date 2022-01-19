import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { FilesystemStore } from '../../../src/data-access/filesystem';
import { Entities } from '../../../src/data-provider/constants';
import { SystemMigrationStatusDataProvider } from '../../../src/data-provider/system-migration';
import { SystemMigrationStatus, SystemMigrationStatusKey } from '../../../src/entities/system-migration-status';

describe('System migration data provider', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('read delegates to data accessor', () => {
        const migrationStatus: SystemMigrationStatus = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        const mockFsStore = jest.spyOn(FilesystemStore.prototype, 'read').mockResolvedValueOnce(migrationStatus);
        expect(new SystemMigrationStatusDataProvider(logger).read(new SystemMigrationStatusKey())).resolves.toBe(
            migrationStatus
        );
        expect(mockFsStore).toBeCalledWith({
            entityName: Entities.SystemMigrationStatus,
            id: new SystemMigrationStatusKey().getId()
        });
    });

    it('write delegates to data accessor', () => {
        const migrationStatus: SystemMigrationStatus = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        const mockFsStore = jest.spyOn(FilesystemStore.prototype, 'write').mockResolvedValueOnce(migrationStatus);
        expect(
            new SystemMigrationStatusDataProvider(logger).write(new SystemMigrationStatus(migrationStatus))
        ).resolves.toBe(migrationStatus);
        expect(mockFsStore).toBeCalledWith({
            entityName: Entities.SystemMigrationStatus,
            id: new SystemMigrationStatusKey().getId(),
            entity: new SystemMigrationStatus(migrationStatus)
        });
    });

    it('delete delegates to data accessor', () => {
        const migrationStatus: SystemMigrationStatus = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        const mockFsStore = jest.spyOn(FilesystemStore.prototype, 'del').mockResolvedValueOnce(true);
        expect(
            new SystemMigrationStatusDataProvider(logger).delete(new SystemMigrationStatus(migrationStatus))
        ).resolves.toBeTrue();
        expect(mockFsStore).toBeCalledWith({
            entityName: Entities.SystemMigrationStatus,
            id: new SystemMigrationStatusKey().getId()
        });
    });

    it('getAll delegates to data accessor', () => {
        const migrationStatus: SystemMigrationStatus = Object.freeze({
            migrationDone: true,
            authTypeMigrated: false,
            migrationLogs: ['line1', 'line2', 'line3']
        });

        const mockFsStore = jest
            .spyOn(FilesystemStore.prototype, 'getAll')
            .mockResolvedValueOnce([new SystemMigrationStatus(migrationStatus)]);
        expect(new SystemMigrationStatusDataProvider(logger).getAll()).resolves.toEqual([
            new SystemMigrationStatus(migrationStatus)
        ]);
        expect(mockFsStore).toBeCalledWith({
            entityName: Entities.SystemMigrationStatus
        });
    });
});
