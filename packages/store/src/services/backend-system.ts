import type { Logger } from '@sap-ux/logger';
import type { BackendServiceRetrievalOptions, BackendSystemService, Service } from '.';
import type { DataProvider } from '../data-provider';
import { SystemType, type ServiceOptions } from '../types';
import { SystemDataProvider } from '../data-provider/backend-system';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system';
import { text } from '../i18n';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getFioriToolsDirectory, getSapToolsDirectory, getEntityFileName } from '../utils';
import { Entity } from '../constants';

/**
 * Should not be used directly, use factory method `getService` instead.
 * Data integrity cannot be guaranteed when using this class directly.
 */
export class SystemService implements Service<BackendSystem, BackendSystemKey> {
    private readonly dataProvider: DataProvider<BackendSystem, BackendSystemKey>;
    private readonly logger: Logger;

    constructor(logger: Logger, options: ServiceOptions = {}) {
        this.logger = logger;
        this.dataProvider = new SystemDataProvider(this.logger, options);
    }

    public async partialUpdate(
        key: BackendSystemKey,
        entity: Partial<BackendSystem>
    ): Promise<BackendSystem | undefined> {
        this.validatePartialUpdateInput(entity);
        const existingSystem = await this.readOrThrow(key);
        const updatedEntity = this.mergeProperties(entity, existingSystem);
        return this.write(updatedEntity, {
            force: true
        });
    }

    private mergeProperties(update: Partial<BackendSystem>, existingSystem: BackendSystem): BackendSystem {
        const patch = { ...update };
        // Make sure we don't mess with key fields
        delete patch.url;
        delete patch.client;
        const updatedEntity = { ...existingSystem, ...patch };
        return new BackendSystem({ ...updatedEntity });
    }

    private async readOrThrow(key: BackendSystemKey): Promise<BackendSystem> {
        const existingSystem = await this.read(key);
        if (!existingSystem) {
            throw new Error(text('error.systemDoesNotExist', { system: key }));
        }
        return existingSystem;
    }

    private validatePartialUpdateInput(entity: Partial<BackendSystem>): void {
        if (!entity || !Object.keys(entity).length) {
            throw new Error(text('error.noPropertiesSpecified'));
        }
    }

    public async read(key: BackendSystemKey): Promise<BackendSystem | undefined> {
        return this.dataProvider.read(key);
    }

    /**
     * Write the backend system to the store. If a backend entity with the same key already exists and error is thrown.
     * Use the `force` option to overwrite, use with cautions and are sure other clients will not break.
     *
     * @param entity the backend system to write
     * @param options
     * @param options.force Force overwrite existing backend system with the same key
     * @returns
     */
    public async write(entity: BackendSystem, options?: { force: boolean }): Promise<BackendSystem | undefined> {
        // Prevent overwrite of existing entity with the same key unless explicitly forced
        const entityKey = BackendSystemKey.from(entity);
        const existingSystem = await this.read(BackendSystemKey.from(entity));

        if (!options?.force && existingSystem) {
            throw new Error(text('error.backendSystemEntityKeyExists', { entityKey: entityKey.getId() }));
        }
        return this.dataProvider.write(entity);
    }

    public async delete(entity: BackendSystem): Promise<boolean> {
        return this.dataProvider.delete(entity);
    }

    public async getAll(options?: BackendServiceRetrievalOptions): Promise<BackendSystem[] | []> {
        return this.dataProvider.getAll(options);
    }

    /**
     * Returns an array of backend systems by applying multiple matching strategies.
     * 1. Direct read from store: URL + client
     * 2. URL-only match for cloud systems (as client is persisted for cloud systems).
     * 3. Match via system info - systemId and client
     *
     * @param url - the url used to read the system from the store
     * @param client - optional client used for reading
     * @param systemInfo - system info
     * @param systemInfo.systemId - the system id
     * @param systemInfo.client - the system client
     *
     * @returns an array of matching backend systems if found, empty array otherwise
     */
    public async findBackendSystems(
        url: string,
        client?: string,
        systemInfo?: { systemId: string; client: string }
    ): Promise<BackendSystem[]> {
        let backendSystems: BackendSystem[] = [];

        const directMatch = await this.dataProvider.read(new BackendSystemKey({ url, client }));
        if (directMatch) {
            backendSystems[0] = directMatch;
        }

        if (!backendSystems[0]) {
            const allSystems = await this.dataProvider.getAll();
            const cloudMatch = allSystems?.find(
                (system) => system.url === url && system.systemType === SystemType.AbapCloud
            );

            if (cloudMatch) {
                backendSystems[0] = cloudMatch;
            } else if (systemInfo?.systemId && systemInfo?.client) {
                const systemInfoMatches = allSystems.filter(
                    (system: BackendSystem) =>
                        system.systemInfo?.systemId === systemInfo.systemId &&
                        system.systemInfo?.client === systemInfo.client
                );
                if (systemInfoMatches) {
                    backendSystems = systemInfoMatches;
                }
            }
        }
        return backendSystems;
    }
}

export function getInstance(logger: Logger, options: ServiceOptions = {}): BackendSystemService {
    if (!options.baseDirectory) {
        try {
            ensureSystemsJsonMigrated();
        } catch (error) {
            logger.error(text('error.systemsJsonMigrationFailed', { error: (error as Error).message }));
        }
        options.baseDirectory = getSapToolsDirectory();
    }
    return new SystemService(logger, options);
}

/**
 * Ensure settings are migrated from .fioritools directory to the new .saptools directory.
 * If the migration has already taken place, we still check if new systems have been added (possibly via an older version of this module)
 * We then migrate only these new systems.
 */
function ensureSystemsJsonMigrated(): void {
    const systemFileName = getEntityFileName(Entity.BackendSystem);
    const legacySystemsPath = join(getFioriToolsDirectory(), systemFileName);
    const newSystemsPath = join(getSapToolsDirectory(), systemFileName);
    const migrationFlag = join(getSapToolsDirectory(), '.systemsMigrated');
    const legacyData = JSON.parse(readFileSync(legacySystemsPath, 'utf-8')).systems as Record<string, BackendSystem>;

    if (existsSync(migrationFlag)) {
        migrateNewLegacyPathEntries(newSystemsPath, legacyData);
    } else {
        // first time migration, move all data from legacy to new path
        mkdirSync(dirname(newSystemsPath), { recursive: true });
        writeFileSync(newSystemsPath, JSON.stringify({ systems: legacyData }, null, 2));
        writeFileSync(migrationFlag, new Date().toISOString());
    }

    // overwrite legacy file entries with migrated flag to avoid re-migration
    const migratedData: Record<string, BackendSystem & { _migrated?: boolean }> = {};
    for (const [key, system] of Object.entries(legacyData)) {
        migratedData[key] = {
            ...system,
            _migrated: true
        };
    }

    writeFileSync(legacySystemsPath, JSON.stringify({ systems: { ...migratedData } }, null, 2));
}

/**
 * Migrates new entries in the systems.json in the legacy path, that have not yet been migrated.
 *
 * @param newSystemsPath - path to the new systems.json file
 * @param legacyData - data from the legacy systems.json file
 */
function migrateNewLegacyPathEntries(newSystemsPath: string, legacyData: Record<string, BackendSystem>): void {
    let hasNewEntries = false;
    const newData: Record<string, BackendSystem> = {};

    for (const [key, system] of Object.entries(legacyData)) {
        if (!(system as BackendSystem & { _migrated?: boolean })._migrated) {
            newData[key] = {
                ...system
            };
            hasNewEntries = true;
        }
    }

    if (hasNewEntries) {
        const existingData = JSON.parse(readFileSync(newSystemsPath, 'utf-8')).systems as Record<string, BackendSystem>;
        writeFileSync(newSystemsPath, JSON.stringify({ systems: { ...existingData, ...newData } }, null, 2));
    }
}
