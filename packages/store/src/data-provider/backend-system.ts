import type { SystemType, ServiceOptions } from '../types';
import type { DataProvider, DataProviderConstructor } from '.';
import type { DataAccess } from '../data-access';
import type { Logger } from '@sap-ux/logger';
import { getHybridStore } from '../data-access/hybrid';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system';
import { Entities } from './constants';
import { getSapToolsDirectory } from '../utils';
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

    public async getAll({
        includeSensitiveData = true,
        includeSystemTypes = []
    }: {
        includeSensitiveData?: boolean;
        includeSystemTypes?: SystemType[];
    } = {}): Promise<BackendSystem[] | []> {
        const migrationRequired = this.isMigrationRequired();
        let systems = await this.dataAccessor.readAll({
            entityName: this.entityName,
            includeSensitiveData: migrationRequired ? true : includeSensitiveData // ensure we read sensitive data for migration
        });

        const allMigrated = await this.migrateBackendSystems(systems, includeSensitiveData);
        if (!allMigrated) {
            // Re-read to ensure we have the updated data
            systems = await this.dataAccessor.readAll({
                entityName: this.entityName,
                includeSensitiveData
            });
        }

        const filteredSystems = Object.values(systems).filter((system) => {
            if (includeSystemTypes.length > 0 && !includeSystemTypes.includes(system.systemType)) {
                return false;
            }
            return true;
        });

        return filteredSystems;
    }

    /**
     * This will indicate if a migration is required based on the presence of a migration file.
     *
     * @returns - true if migration is required, false otherwise
     */
    private isMigrationRequired(): boolean {
        const migrationFilePath = join(getSapToolsDirectory(), '.systemsMigrated');
        // need to read the file and check if 'backendSystemMigrationV1' property exists
        try {
            const migrationFileData = JSON.parse(readFileSync(migrationFilePath, 'utf-8'));
            if (migrationFileData?.backendSystemMigrationV1) {
                return false; // migration already done
            }
        } catch {
            // ignore JSON parse errors and treat as migration required
        }
        return true;
    }

    /**
     * We need to continually check and migrate systems - older consumers may have added systems that still need migration.
     *
     * @param systems - all systems
     * @param containsSensitiveData - whether sensitive was included in the call
     * @returns - true if all systems are migrated, false otherwise
     */
    private async migrateBackendSystems(
        systems: Record<string, BackendSystem>,
        containsSensitiveData: boolean
    ): Promise<boolean> {
        let allMigrated = true;
        for (const [id, system] of Object.entries(systems)) {
            const newKey = BackendSystemKey.from(system).getId();
            if (id === newKey && system?.hasSensitiveData !== undefined) {
                continue; // already fully migrated
            }
            allMigrated = false;

            let systemWithCreds = system;
            // if containsSensitiveData is false, we need to read the full system including sensitive data for migration
            if (!containsSensitiveData) {
                systemWithCreds = await this.dataAccessor.read({
                    entityName: this.entityName,
                    id
                });
            }
            const backendSystem = new BackendSystem({ ...(systemWithCreds as BackendSystem) });

            if (id !== newKey) {
                await this.updateBackendKey(backendSystem, id, newKey);
            } else {
                await this.dataAccessor.partialUpdate({
                    entityName: this.entityName,
                    id,
                    entity: { hasSensitiveData: backendSystem.hasSensitiveData }
                });
            }
        }

        if (!allMigrated) {
            writeFileSync(
                join(getSapToolsDirectory(), '.systemsMigrated'),
                JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() })
            );
        }

        return allMigrated;
    }

    /**
     * Will update the backend system key by writing a new entry and deleting the old one.
     *
     * @param system - the backend system
     * @param existingKey - the existing key
     * @param newKey - the new key
     */
    private async updateBackendKey(system: BackendSystem, existingKey: string, newKey: string): Promise<void> {
        try {
            await this.dataAccessor.write({
                entityName: this.entityName,
                id: newKey,
                entity: system
            });
            await this.dataAccessor.del({
                entityName: this.entityName,
                id: existingKey
            });
        } catch (error) {
            this.logger.error(
                `Error migrating backend system key from [${existingKey}] to [${newKey}]: ${(error as Error).message}`
            );
        }
    }
};
