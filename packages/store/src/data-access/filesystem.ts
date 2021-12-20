import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, FSWatcher, watch, existsSync } from 'fs';
import { plural } from 'pluralize';
import { getFioriToolsDirectory } from '@sap-ux/common-utils';
import { DataAccess, DataAccessConstructor } from '.';
import { errorInstance, Logger } from '../utils';
import { Entity } from '..';

export const basedir = getFioriToolsDirectory;

export const FilesystemStore: DataAccessConstructor<object> = class implements DataAccess<object> {
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    public async read<Entity extends object>({
        entityName,
        id
    }: {
        entityName: string;
        id: string;
    }): Promise<undefined | Entity> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('read: Entity Type is falsy - ' + entityName);
            return Promise.resolve(undefined);
        }

        const { entities, error } = this._readAll<Entity>(name);
        if (error) {
            if (error.code === 'ENOENT') {
                return Promise.resolve(undefined);
            } else {
                throw error;
            }
        }
        if (!entities) {
            this.logger.debug(`read: After parsing, entities is falsy. Entity: ${name}, parsed value: ${entities}`);
            return undefined;
        }
        return Promise.resolve(entities[id]);
    }

    public async getAll<Entity extends object>({ entityName }: { entityName: string }): Promise<Entity[] | []> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('read: Entity Type is falsy - ' + entityName);
            return Promise.resolve([]);
        }

        const { entities, error } = this._readAll<Entity>(name);
        if (error) {
            if (error.code === 'ENOENT') {
                return Promise.resolve([]);
            } else {
                throw error;
            }
        }
        if (!entities) {
            this.logger.debug(`read: After parsing, entities is falsy. Entity: ${name}, parsed value: ${entities}`);
            return Promise.resolve([]);
        }
        return Promise.resolve(Object.values(entities));
    }

    public async readAll<Entity extends object>({
        entityName
    }: {
        entityName: string;
    }): Promise<{ [key: string]: Entity }> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('read: Entity Type is falsy - ' + entityName);
            return Promise.resolve({});
        }

        const { entities, error } = this._readAll<Entity>(name);
        if (error) {
            if (error.code === 'ENOENT') {
                return Promise.resolve({});
            } else {
                throw error;
            }
        }
        if (!entities) {
            this.logger.debug(`read: After parsing, entities is falsy. Entity: ${name}, parsed value: ${entities}`);
            return Promise.resolve({});
        }
        return Promise.resolve(entities);
    }

    public async write<Entity extends object>({
        entityName,
        id,
        entity
    }: {
        entityName: string;
        id: string;
        entity: Entity;
    }): Promise<undefined | Entity> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('write: Entity is falsy - ' + name);
            return Promise.resolve(undefined);
        }

        const { entities = {}, error } = this._readAll<Entity>(name);
        if (error && error.code !== 'ENOENT') {
            throw error;
        }

        entities[id] = entity;
        this.writeToFile(name, entities);
        return Promise.resolve(entity);
    }

    async del<Entity extends object>({ entityName, id }: { entityName: string; id: string }): Promise<boolean> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('delete: Entity is falsy - ' + name);
            return Promise.resolve(false);
        }

        const { entities = {}, error } = this._readAll<Entity>(name);
        if (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        const exists = !!entities[id];
        if (exists) {
            this.logger.debug(`delete: entity found  for id - ${id}. Deleting`);
            delete entities[id];
            this.writeToFile(name, entities);
            return Promise.resolve(true);
        } else {
            this.logger.debug('delete: entity not found');
            return Promise.resolve(false);
        }
    }

    private _readAll<E extends object>(
        entityName: string
    ): { entities?: { [key: string]: E }; error?: Error & { code?: string } } {
        let rawContents: string;
        try {
            rawContents = readFileSync(join(basedir(), `${entityName}.json`))
                ?.toString()
                .trim();
        } catch (e) {
            const err = errorInstance(e);
            this.logger.debug(err.message);
            return { error: err };
        }

        if (!rawContents) {
            return { entities: undefined };
        }

        let entities: { [key: string]: E } | undefined = undefined;
        try {
            entities = JSON.parse(rawContents)?.[entityName];
        } catch (e) {
            return { error: errorInstance(e) };
        }

        return { entities };
    }

    private writeToFile<Entity extends object>(entityName: string, entities: { [key: string]: Entity }): void {
        const base = basedir();
        const data = JSON.stringify({ [entityName]: entities }, null, 2);
        const filename = getEntityFileName(entityName);
        try {
            writeFileSync(join(base, filename), data);
        } catch (e) {
            const err = errorInstance(e);
            if (err?.code === 'ENOENT') {
                this.logger.debug(`Base directory [${base}] does not exist, trying to create it`);
                mkdirSync(base, { recursive: true });
                writeFileSync(join(base, filename), data);
            } else {
                throw e;
            }
        }
    }
};

/**
 * Trims, lowercases and returns plural if a non-empty string
 * @param s
 */
function toPersistenceName(s: string): string | undefined {
    const t = s?.trim().toLowerCase();
    return t && plural(t);
}

function getEntityFileName(entityName: string): string {
    return toPersistenceName(entityName) + '.json';
}

/** Return an FSWatcher for a given entity name
 *  The client is responsible for disposing of the FSWatcher
 */
export function getFilesystemWatcherFor(
    entityName: Entity,
    callback: (entityName: string) => void
): FSWatcher | undefined {
    const watchPath = join(basedir(), getEntityFileName(entityName));
    if (existsSync(watchPath)) {
        return watch(watchPath, undefined, () => {
            callback(entityName);
        });
    } else {
        // this.logger is only valid in the constructed class
        console.warn(`File Not Found: ${watchPath}`);
    }
}
