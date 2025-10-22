import type { Logger } from '@sap-ux/logger';
import type { Service, ServiceRetrievalOptions } from '.';
import type { DataProvider } from '../data-provider';
import type { ServiceOptions } from '../types';
import { SystemDataProvider } from '../data-provider/backend-system';
import { BackendSystem, BackendSystemKey } from '../entities/backend-system';
import { text } from '../i18n';
import { existsSync, copyFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getFioriToolsDirectory, getSapDevToolsDirectory, getEntityFileName } from '../utils';
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
    public async getAll(options: ServiceRetrievalOptions): Promise<BackendSystem[] | []> {
        return this.dataProvider.getAll(options);
    }
}

export function getInstance(logger: Logger, options: ServiceOptions = {}): SystemService {
    if (!options.baseDirectory) {
        ensureSettingsMigrated();
        options.baseDirectory = getSapDevToolsDirectory();
    }
    return new SystemService(logger, options);
}

/**
 * Ensure settings are migrated from the old fiori tools directory to the new sap development tools directory.
 */
function ensureSettingsMigrated(): void {
    const sapDevToolsDir = getSapDevToolsDirectory();
    const migrationFlag = join(sapDevToolsDir, '.systemsMigrated');

    if (existsSync(migrationFlag)) {
        return;
    }

    const systemFileName = getEntityFileName(Entity.BackendSystem);
    const legacyPath = join(getFioriToolsDirectory(), systemFileName);
    const newPath = join(sapDevToolsDir, systemFileName);

    if (existsSync(legacyPath)) {
        mkdirSync(dirname(newPath), { recursive: true });
        copyFileSync(legacyPath, newPath);
        writeFileSync(migrationFlag, new Date().toISOString());
    }
}
