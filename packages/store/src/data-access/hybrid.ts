import { getFilesystemStore as dataAccessFilesystem } from './filesystem';
import { pick } from '../utils';
import type { Logger } from '@sap-ux/logger';
import type { SecureStore } from '../secure-store';
import { getSecureStore } from '../secure-store';
import { getSensitiveDataProperties, getSerializableProperties } from '../decorators';
import type { DataAccess } from '.';
import type { ServiceOptions } from '../types';
import { inspect } from 'util';

function getFullyQualifiedServiceName(name: string): string {
    return 'fiori/v2/' + name;
}

class HybridStore<E extends object> implements DataAccess<E> {
    private readonly logger: Logger;
    private readonly filesystem: DataAccess<E>;
    private readonly secureStore: SecureStore;

    constructor(logger: Logger, options: ServiceOptions = {}) {
        this.logger = logger;
        this.filesystem = dataAccessFilesystem<E>(this.logger, options);
        this.secureStore = getSecureStore(this.logger);
    }

    public async read({ entityName, id }: { entityName: string; id: string }): Promise<undefined | E> {
        const serialized = await this.filesystem.read({ entityName, id });
        if (!serialized) {
            this.logger.debug(`hybrid/read - id: [${id}], nothing on the filesystem`);
        } else {
            this.logger.debug(`hybrid/read - id: [${id}], filesystem: ${inspect(serialized)}`);
        }

        const sensitiveData: E | undefined = await this.secureStore.retrieve(
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
            return { ...serialized, ...sensitiveData } as E;
        } else {
            return undefined;
        }
    }

    public async getAll({ entityName }: { entityName: string }): Promise<[] | E[]> {
        return Object.values(await this.readAll({ entityName })) as unknown as E[];
    }

    async readAll({ entityName }: { entityName: string }): Promise<{ [key: string]: E }> {
        const result: { [key: string]: E } = {};

        const entitiesFs = (await this.filesystem.readAll({ entityName })) || {};
        const entitiesInSecureStore =
            (await this.secureStore.getAll<E>(getFullyQualifiedServiceName(entityName))) || {};

        for (const key of new Set([...Object.keys(entitiesFs), ...Object.keys(entitiesInSecureStore)])) {
            // Make sure sensitive props override serialized ones
            const entity: E = { ...entitiesFs[key], ...entitiesInSecureStore[key] };
            result[key] = entity;
        }
        return result;
    }

    public async write({
        entityName,
        id,
        entity
    }: {
        entityName: string;
        id: string;
        entity: E;
    }): Promise<undefined | E> {
        const serializableProps = getSerializableProperties<E>(entity);
        const sensitiveProps = getSensitiveDataProperties<E>(entity);

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

        const serializable: E = pick(entity, ...serializableProps) as E;

        if (serializable) {
            this.logger.debug(`hybrid/write - writing serializable properties: ${inspect(serializable)}`);
            await this.filesystem.write({ entityName, id, entity: serializable });
        } else {
            this.logger.debug(`hybrid/write - no serializable properties found in ${inspect(serializable)}`);
        }

        const sensitiveData = pick(entity, ...sensitiveProps);
        if (sensitiveData) {
            this.logger.debug(`hybrid/write - writing sensitive properties to secure store. ID: [${id}]`);
            await this.secureStore.save(getFullyQualifiedServiceName(entityName), id, sensitiveData);
        } else {
            this.logger.debug(`hybrid/write - no sensitive properties found in ${inspect(entity)}`);
        }

        return entity;
    }

    public async del({ entityName, id }: { entityName: string; id: string }): Promise<boolean> {
        const deletedinFs = await this.filesystem.del({ entityName, id });
        this.logger.debug(`hybrid/del - delete result for id [${id}] on the filesystem: ${deletedinFs}`);

        const deletedInSecureStore = await this.secureStore.delete(getFullyQualifiedServiceName(entityName), id);
        this.logger.debug(`hybrid/del - delete result for id [${id}] in the secure store: ${deletedInSecureStore}`);

        return deletedinFs || deletedInSecureStore;
    }
}

/** A hybrid store
 * Stores serializable properties on the filesystem
 * The properties need to be decorated with `@serilizable` annotations
 *
 * Sensitive properties (decorated with `@sensitiveData`) will be stored
 * in the system's secure store
 */
export function getHybridStore<E extends object>(logger: Logger, options?: ServiceOptions): DataAccess<E> {
    return new HybridStore<E>(logger, options);
}
