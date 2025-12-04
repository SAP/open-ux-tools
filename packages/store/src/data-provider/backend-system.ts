import type { BackendSerializableKeys, ServiceOptions } from '../types';
import type { BackendProviderRetrievalOptions, BackendSystemFilter, DataProvider, DataProviderConstructor } from '.';
import type { DataAccess } from '../data-access';
import type { Logger } from '@sap-ux/logger';
import { getHybridStore } from '../data-access/hybrid';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system';
import { Entities } from './constants';
import { ConnectionType } from '../types';
import { getBackendSystemType, getSapToolsDirectory } from '../utils';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

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

    public async getAll(providerRetrievalOptions: BackendProviderRetrievalOptions): Promise<BackendSystem[]> {
        const migrationRequired = this.isMigrationRequired();
        const { includeSensitiveData = true, backendSystemFilter } = providerRetrievalOptions ?? {};

        // Always fetch sensitive data if migration is pending
        let systems = await this.dataAccessor.readAll({
            entityName: this.entityName,
            includeSensitiveData: migrationRequired ? true : includeSensitiveData
        });

        const migrationComplete = await this.migrateBackendSystems(systems, includeSensitiveData);

        // If migration occurred, re-read to get the fully updated dataset
        if (!migrationComplete) {
            systems = await this.dataAccessor.readAll({
                entityName: this.entityName,
                includeSensitiveData
            });
        }

        const systemList = Object.values(systems);

        if (!backendSystemFilter) {
            return systemList;
        }

        return this.applyFilters(systemList, backendSystemFilter);
    }

    /**
     * Determines whether a migration is required based on a local marker file.
     */
    private isMigrationRequired(): boolean {
        const migrationFilePath = join(getSapToolsDirectory(), '.systemsMigrated');
        try {
            const raw = readFileSync(migrationFilePath, 'utf-8');
            const data = JSON.parse(raw);
            return !data?.backendSystemMigrationV1;
        } catch {
            // If anything fails (file missing, parse error), treat as not migrated
            return true;
        }
    }

    /**
     * Applies filter objects to a list of backend systems.
     */
    private applyFilters(systems: BackendSystem[], filters: BackendSystemFilter = {}): BackendSystem[] {
        return systems.filter((system) =>
            Object.entries(filters).every(([key, value]) => system[key as BackendSerializableKeys] === value)
        );
    }

    /**
     * Ensures all stored backend systems are migrated to the latest structure.
     */
    private async migrateBackendSystems(
        systems: Record<string, BackendSystem>,
        containsSensitiveData: boolean
    ): Promise<boolean> {
        let allMigrated = true;

        for (const [id, system] of Object.entries(systems)) {
            // Skip already-migrated entries
            const alreadyMigrated =
                system?.hasSensitiveData !== undefined &&
                system?.systemType !== undefined &&
                system?.connectionType !== undefined;

            if (alreadyMigrated) {
                continue;
            }

            allMigrated = false;

            const migratedSystem = await this.buildMigratedSystem(system, containsSensitiveData, id);

            await this.dataAccessor.partialUpdate({
                entityName: this.entityName,
                id,
                entity: {
                    hasSensitiveData: migratedSystem.hasSensitiveData,
                    systemType: migratedSystem.systemType,
                    connectionType: migratedSystem.connectionType
                }
            });
        }

        if (!allMigrated) {
            // Write migration marker file
            const filePath = join(getSapToolsDirectory(), '.systemsMigrated');
            const marker = { backendSystemMigrationV1: new Date().toISOString() };
            writeFileSync(filePath, JSON.stringify(marker, null, 2));
        }

        return allMigrated;
    }

    /**
     * Builds a fully migrated BackendSystem instance.
     */
    private async buildMigratedSystem(
        system: BackendSystem,
        containsSensitiveData: boolean,
        id: string
    ): Promise<BackendSystem> {
        let fullSystem = system;
        // Ensure sensitive data available if needed
        if (!containsSensitiveData) {
            fullSystem = await this.dataAccessor.read({
                entityName: this.entityName,
                id
            });
        }
        const inferredSystemType = fullSystem.systemType ?? getBackendSystemType(fullSystem);
        const connectionType = fullSystem?.connectionType ?? ConnectionType.AbapCatalog; // will need to be removed once adding different connection types is possible
        return new BackendSystem({
            ...fullSystem,
            systemType: inferredSystemType,
            connectionType
        });
    }
};
