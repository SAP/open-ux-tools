import { FilesystemStore } from './filesystem';
import { pick, Logger } from '../utils';
import { getSecureStore, SecureStore } from '../secure-store';
import { getSensitiveDataProperties, getSerializableProperties } from '../decorators';
import { DataAccess, DataAccessConstructor } from '.';
import { ServiceOptions } from '../types';

function getFullyQualifiedServiceName(name: string): string {
    return 'fiori/v2/' + name;
}

/** A hybrid store
 * Stores serializable properties on the filesystem
 * The properties need to be decorated with `@serilizable` annotations
 *
 * Sensitive properties (decorated with `@sensitiveData`) will be stored
 * in the system's secure store
 */
export const HybridStore: DataAccessConstructor<object> = class implements DataAccess<object> {
    private readonly logger: Logger;
    private readonly filesystem: DataAccess<object>;
    private readonly secureStore: SecureStore;

	constructor(logger: Logger, options: ServiceOptions = {}) {
        this.logger = logger;
        this.filesystem = new FilesystemStore(this.logger, options);
        this.secureStore = getSecureStore(this.logger);
    }

    public async read<Entity extends object>({
        entityName,
        id
    }: {
        entityName: string;
        id: string;
    }): Promise<undefined | Partial<Entity>> {
        const serialized = await this.filesystem.read({ entityName, id });
        if (!serialized) {
            this.logger.debug(`hybrid/read - id: [${id}], nothing on the filesystem`);
        } else {
            this.logger.debug('hybrid/read - id: [%s], filesystem: %O', id, serialized);
        }

        const sensitiveData: Partial<Entity> | undefined = await this.secureStore.retrieve(
            getFullyQualifiedServiceName(entityName),
            id
        );
        if (!sensitiveData) {
            this.logger.debug(`hybrid/read - id: [${id}], nothing in the secure store`);
        } else {
            this.logger.debug(`hybrid/read - id: [${id}]. Found sensitive data in secure store`);
        }

        if (serialized || sensitiveData) {
            // Make sure sensitive props override serialized ones
            return { ...serialized, ...sensitiveData };
        } else {
            return undefined;
        }
    }

    public async getAll<Entity extends object>({
        entityName
    }: {
        entityName: string;
    }): Promise<[] | Partial<Entity>[]> {
        return Object.values(await this.readAll({ entityName }));
    }

    async readAll<Entity extends object>({ entityName }: { entityName: string }): Promise<{ [key: string]: Entity }> {
        const result: { [key: string]: Entity } = {};

        const entitiesFs = (await this.filesystem.readAll({ entityName })) || {};
        const entitiesInSecureStore =
            (await this.secureStore.getAll<Entity>(getFullyQualifiedServiceName(entityName))) || {};

        for (const key of new Set([...Object.keys(entitiesFs), ...Object.keys(entitiesInSecureStore)])) {
            // Make sure sensitive props override serialized ones
            const entity: Entity = { ...entitiesFs[key], ...entitiesInSecureStore[key] };
            result[key] = entity;
        }
        return result;
    }

    public async write<Entity extends object>({
        entityName,
        id,
        entity
    }: {
        entityName: string;
        id: string;
        entity: Entity;
    }): Promise<undefined | Partial<Entity>> {
        const serializableProps = getSerializableProperties(entity);
        const sensitiveProps = getSensitiveDataProperties(entity);

        if (serializableProps.length > 0 && sensitiveProps.length > 0) {
            for (let i = 0; i < serializableProps.length; i = i + 1) {
                if (sensitiveProps.indexOf(serializableProps[i]) !== -1) {
                    this.logger.debug(
                        `hybrid/write - [${serializableProps[i]}] is also marked as sensitive. Not writing to filesystem`
                    );
                    serializableProps.splice(i, 1);
                }
            }
        }

        const serializable = pick(entity, ...serializableProps);

        if (serializable) {
            this.logger.debug('hybrid/write - writing serializable properties: %O', serializable);
            await this.filesystem.write({ entityName, id, entity: serializable });
        } else {
            this.logger.debug('hybrid/write - no serializable properties found in %O', serializable);
        }

        const sensitiveData = pick(entity, ...sensitiveProps);
        if (sensitiveData) {
            this.logger.debug(`hybrid/write - writing sensitive properties to secure store. ID: [${id}]`);
            await this.secureStore.save(getFullyQualifiedServiceName(entityName), id, sensitiveData);
        } else {
            this.logger.debug('hybrid/write - no sensitive properties found in %O', entity);
        }

        return entity;
    }

    public async del<Entity extends object>({ entityName, id }: { entityName: string; id: string }): Promise<boolean> {
        const deletedinFs = await this.filesystem.del({ entityName, id });
        this.logger.debug(`hybrid/del - delete result for id [${id}] on the filesystem: ${deletedinFs}`);

        const deletedInSecureStore = await this.secureStore.delete(getFullyQualifiedServiceName(entityName), id);
        this.logger.debug(`hybrid/del - delete result for id [${id}] in the secure store: ${deletedInSecureStore}`);

        return deletedinFs || deletedInSecureStore;
    }
};
