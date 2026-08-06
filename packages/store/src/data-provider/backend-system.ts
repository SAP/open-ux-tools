import type { ServiceOptions } from '../types.js';
import type {
    BackendProviderRetrievalOptions,
    BackendSystemFilter,
    DataProvider,
    DataProviderConstructor
} from './index.js';
import type { DataAccess } from '../data-access/index.js';
import type { Logger } from '@sap-ux/logger';
import { getHybridStore } from '../data-access/hybrid.js';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system.js';
import { Entities } from './constants.js';
import { ConnectionType, SystemSource } from '../types.js';
import { getBackendSystemType, getSapToolsDirectory, isMatch } from '../utils/index.js';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { readAdtSystems, writeAdtSystem, deleteAdtSystem } from './adt-destinations.js';

export const SystemDataProvider: DataProviderConstructor<BackendSystem, BackendSystemKey> =
    class implements DataProvider<BackendSystem, BackendSystemKey> {
        private readonly dataAccessor: DataAccess<BackendSystem>;
        private readonly entityName = Entities.BackendSystem;
        private readonly logger: Logger;

        constructor(logger: Logger, options: ServiceOptions = {}) {
            this.logger = logger;
            this.dataAccessor = getHybridStore(this.logger, options);
        }

        public async read(key: BackendSystemKey): Promise<BackendSystem | undefined> {
            // Stored systems (systems.json) take precedence over ADT destinations on id collision,
            // consistent with getAll()'s `{ ...adtSystems, ...systems }` merge.
            const stored = await this.dataAccessor.read({ entityName: this.entityName, id: key.getId() });
            if (stored) {
                return stored;
            }
            return readAdtSystems(this.logger)[key.getId()];
        }

        public async write(entity: BackendSystem): Promise<BackendSystem | undefined> {
            // Route ADT-owned systems back to destinations.json; never to systems.json.
            if (await this.isAdtSystem(entity)) {
                writeAdtSystem(entity, this.logger);
                return entity;
            }
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
            if (await this.isAdtSystem(entity)) {
                return deleteAdtSystem(entity, this.logger);
            }
            return this.dataAccessor.del({
                entityName: this.entityName,
                id: BackendSystemKey.from(entity).getId()
            });
        }

        /**
         * Determines whether the given system is owned by ADT (backed by destinations.json).
         *
         * The in-memory `source` marker is authoritative. As a fallback (e.g. the entity was
         * reconstructed and lost the marker) the current ADT destinations are consulted by store id —
         * but ONLY when no system with that id exists in systems.json. This ensures a genuine stored
         * system whose id happens to collide with an ADT destination is never misrouted to
         * destinations.json (which would silently drop its stored credentials).
         *
         * @param entity - the system being written or deleted
         * @returns true if the system is an ADT-owned destination
         */
        private async isAdtSystem(entity: BackendSystem): Promise<boolean> {
            if (entity.source === SystemSource.Adt) {
                return true;
            }
            const id = BackendSystemKey.from(entity).getId();
            if (!readAdtSystems(this.logger)[id]) {
                return false;
            }
            // Only treat as ADT-owned when there is no genuine stored system with this id.
            const stored = await this.dataAccessor.read({ entityName: this.entityName, id });
            return !stored;
        }

        public async getAll(providerRetrievalOptions?: BackendProviderRetrievalOptions): Promise<BackendSystem[]> {
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

            // Merge in ADT destinations (backed by destinations.json), without feeding them to the
            // systems.json migration above. Stored (systems.json) systems take precedence on id collision;
            // log any ADT entries that are dropped so the collision is visible rather than silent.
            const adtSystems = readAdtSystems(this.logger);
            for (const id of Object.keys(adtSystems)) {
                if (systems[id]) {
                    this.logger.info(
                        `ADT destination '${id}' is already present in systems.json as '${systems[id].name}'; the stored system takes precedence.`
                    );
                }
            }
            const merged = { ...adtSystems, ...systems };

            return this.applyFilters(Object.values(merged), backendSystemFilter);
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
            if (!filters.connectionType) {
                // unless a filter for connectionType is explicitly provided, default to filtering by the ABAP Catalog type as this is what existing consumers expect
                filters.connectionType = 'abap_catalog';
            }
            return systems.filter((system) => isMatch(system, filters));
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
            const inferredSystemType = fullSystem.systemType ?? getBackendSystemType(fullSystem) ?? 'OnPrem';
            const connectionType = fullSystem?.connectionType ?? ConnectionType.AbapCatalog; // will need to be removed once adding different connection types is possible
            return new BackendSystem({
                ...fullSystem,
                systemType: inferredSystemType,
                connectionType
            });
        }
    };
