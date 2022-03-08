import type { DataProvider, DataProviderConstructor } from '.';
import type { DataAccess } from '../data-access';
import type { SystemMigrationStatus } from '../entities/system-migration-status';
import { SystemMigrationStatusKey } from '../entities/system-migration-status';
import type { Logger } from '@sap-ux/logger';
import { Entities } from './constants';
import { getFilesystemStore } from '../data-access/filesystem';

export const SystemMigrationStatusDataProvider: DataProviderConstructor<
    SystemMigrationStatus,
    SystemMigrationStatusKey
> = class implements DataProvider<SystemMigrationStatus, SystemMigrationStatusKey> {
    private readonly dataAccessor: DataAccess<SystemMigrationStatus>;
    private readonly entityName = Entities.SystemMigrationStatus;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.dataAccessor = getFilesystemStore(this.logger);
    }

    public read(key: SystemMigrationStatusKey): Promise<SystemMigrationStatus | undefined> {
        return this.dataAccessor.read({ entityName: this.entityName, id: key.getId() });
    }

    public write(entity: SystemMigrationStatus): Promise<SystemMigrationStatus | undefined> {
        return this.dataAccessor.write({
            entityName: this.entityName,
            id: new SystemMigrationStatusKey().getId(),
            entity
        });
    }

    public delete(_entity: SystemMigrationStatus): Promise<boolean> {
        return this.dataAccessor.del({
            entityName: this.entityName,
            id: new SystemMigrationStatusKey().getId()
        });
    }

    public getAll(): Promise<SystemMigrationStatus[] | []> {
        return this.dataAccessor.getAll({ entityName: this.entityName });
    }
};
