import type { ServiceOptions } from '../types';
import type { DataProvider, DataProviderConstructor } from '.';
import type { DataAccess } from '../data-access';
import { getHybridStore } from '../data-access/hybrid';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system';
import type { Logger } from '@sap-ux/logger';
import { Entities } from './constants';

export const SystemDataProvider: DataProviderConstructor<BackendSystem, BackendSystemKey> = class
    implements DataProvider<BackendSystem, BackendSystemKey>
{
    private readonly dataAccessor: DataAccess<BackendSystem>;
    private readonly entityName = Entities.BackendSystem;
    private readonly logger: Logger;

    constructor(logger: Logger, options: ServiceOptions = {}) {
        this.logger = logger;
        this.dataAccessor = getHybridStore(this.logger, options);
    }

    public async read(key: BackendSystemKey): Promise<BackendSystem | undefined> {
        return this.dataAccessor.read({ entityName: this.entityName, id: key.getId() });
    }

    public async write(entity: BackendSystem): Promise<BackendSystem | undefined> {
        let e: BackendSystem;
        if (!(entity instanceof BackendSystem)) {
            // We need to use the correct class otherwise the annotations are not effective
            e = new BackendSystem({ ...(entity as BackendSystem) });
        } else {
            e = entity;
        }
        return this.dataAccessor.write({
            entityName: this.entityName,
            id: BackendSystemKey.from(entity).getId(),
            entity: e
        });
    }

    public async delete(entity: BackendSystem): Promise<boolean> {
        return this.dataAccessor.del({
            entityName: this.entityName,
            id: BackendSystemKey.from(entity).getId()
        });
    }

    public async getAll(): Promise<BackendSystem[] | []> {
        const systems = await this.dataAccessor.readAll({ entityName: this.entityName });
        for (const id of Object.keys(systems)) {
            const system = systems[id];
            if (!system?.url?.trim()) {
                this.logger.warn(`Filtering system with ID [${id}] as it seems corrupt. Run repair`);
                delete systems[id];
            }
        }
        return Object.values(systems);
    }
};
