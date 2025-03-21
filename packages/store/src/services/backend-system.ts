import type { Logger } from '@sap-ux/logger';
import type { Service } from '.';
import type { DataProvider } from '../data-provider';
import { SystemDataProvider } from '../data-provider/backend-system';
import type { BackendSystemKey } from '../entities/backend-system';
import { BackendSystem } from '../entities/backend-system';
import { text } from '../i18n';
import type { ServiceOptions } from '../types';

/**
 *
 */
export class SystemService implements Service<BackendSystem, BackendSystemKey> {
    private readonly dataProvider: DataProvider<BackendSystem, BackendSystemKey>;
    private readonly logger: Logger;

    /**
     *
     * @param logger
     * @param options
     */
    constructor(logger: Logger, options: ServiceOptions = {}) {
        this.logger = logger;
        this.dataProvider = new SystemDataProvider(this.logger, options);
    }
    /**
     *
     * @param key
     * @param entity
     */
    public async partialUpdate(
        key: BackendSystemKey,
        entity: Partial<BackendSystem>
    ): Promise<BackendSystem | undefined> {
        this.validatePartialUpdateInput(entity);
        const existingSystem = await this.readOrThrow(key);
        const updatedEntity = this.mergeProperties(entity, existingSystem);
        return this.write(updatedEntity);
    }

    /**
     *
     * @param update
     * @param existingSystem
     */
    private mergeProperties(update: Partial<BackendSystem>, existingSystem: BackendSystem): BackendSystem {
        const patch = { ...update };
        // Make sure we don't mess with key fields
        delete patch.url;
        delete patch.client;
        const updatedEntity = { ...existingSystem, ...patch };
        return new BackendSystem({ ...updatedEntity });
    }

    /**
     *
     * @param key
     */
    private async readOrThrow(key: BackendSystemKey): Promise<BackendSystem> {
        const existingSystem = await this.read(key);
        if (!existingSystem) {
            throw new Error(text('error.systemDoesNotExist', { system: key }));
        }
        return existingSystem;
    }

    /**
     *
     * @param entity
     */
    private validatePartialUpdateInput(entity: Partial<BackendSystem>): void {
        if (!entity || !Object.keys(entity).length) {
            throw new Error(text('error.noPropertiesSpecified'));
        }
    }

    /**
     *
     * @param key
     */
    public async read(key: BackendSystemKey): Promise<BackendSystem | undefined> {
        return this.dataProvider.read(key);
    }
    /**
     *
     * @param entity
     */
    public async write(entity: BackendSystem): Promise<BackendSystem | undefined> {
        return this.dataProvider.write(entity);
    }
    /**
     *
     * @param entity
     */
    public async delete(entity: BackendSystem): Promise<boolean> {
        return this.dataProvider.delete(entity);
    }
    /**
     *
     */
    public async getAll(): Promise<BackendSystem[] | []> {
        return this.dataProvider.getAll();
    }
}

/**
 *
 * @param logger
 * @param options
 */
export function getInstance(logger: Logger, options: ServiceOptions = {}): SystemService {
    return new SystemService(logger, options);
}
