import type { ServiceOptions } from '../types';
import type { DataProvider, DataProviderConstructor } from '.';
import type { DataAccess } from '../data-access';
import { getHybridStore } from '../data-access/hybrid';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system';
import type { Logger } from '@sap-ux/logger';
import { Entities } from './constants';
import { getBackendSystemType } from '../utils';
import { getFilesystemStore } from '../data-access/filesystem';

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

    public async getAll({
        includeSensitiveData = true
    }: {
        includeSensitiveData?: boolean;
    } = {}): Promise<BackendSystem[] | []> {
        let systems = await this.dataAccessor.readAll({ entityName: this.entityName, includeSensitiveData });
        if (!includeSensitiveData) {
            const allMigrated = await this.ensureSystemTypesExist(systems);
            if (!allMigrated) {
                // Re-read to ensure we have the updated data
                systems = await this.dataAccessor.readAll({
                    entityName: this.entityName,
                    includeSensitiveData
                });
            }
        }

        for (const id of Object.keys(systems)) {
            let system: BackendSystem | undefined = systems[id];
            if (!system?.url?.trim()) {
                // attempt to recover the system URL from the ID
                await this.recoverUrlFromId(id);
                system = await this.dataAccessor.read({
                    entityName: this.entityName,
                    id
                });
                if (!system?.url?.trim()) {
                    this.logger.warn(`Filtering system with ID [${id}] as it seems corrupt. Run repair`);
                    delete systems[id];
                }
            }
        }
        return Object.values(systems);
    }

    /**
     * Recover the URL from the system ID and write it to the file.
     *
     * @param systemId - the specific system ID to recover
     */
    private async recoverUrlFromId(systemId: string): Promise<void> {
        try {
            const urlObj = new URL(systemId);
            const client =
                urlObj.pathname && /^\d{3}$/.test(urlObj.pathname.slice(1)) ? urlObj.pathname.slice(1) : undefined;
            const backendSystem: BackendSystem = {
                name: urlObj.origin + (client ? ', client ' + client : ''),
                url: urlObj.origin,
                ...(client ? { client } : {})
            };
            // requires to write directly to the filesystem
            const fileSystem = getFilesystemStore(this.logger);
            await fileSystem.write({ entityName: this.entityName, id: systemId, entity: backendSystem });
        } catch {
            this.logger.error(`Error while writing recovered entries from the secure store to the file.`);
        }
    }

    private async ensureSystemTypesExist(systems: Record<string, BackendSystem>): Promise<boolean> {
        let allSystemsHaveType = true;

        for (const [id, system] of Object.entries(systems)) {
            if (!system?.systemType) {
                allSystemsHaveType = false;
                await this.assignSystemType(id);
            }
        }

        return allSystemsHaveType;
    }

    /**
     * Temporary migration function to infer and assign a systemType to a system by ID.
     *
     * @param systemId ID of the system to migrate
     */
    private async assignSystemType(systemId: string): Promise<void> {
        const system = await this.dataAccessor.read({ entityName: this.entityName, id: systemId });
        if (system) {
            const inferredType = getBackendSystemType(system);
            if (inferredType) {
                await this.dataAccessor.partialUpdate({
                    entityName: this.entityName,
                    id: systemId,
                    entity: { systemType: inferredType }
                });
            }
        }
    }
};
