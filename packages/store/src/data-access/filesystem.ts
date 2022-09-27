import path from 'path';
import type { FSWatcher } from 'fs';
import fs, { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { plural } from 'pluralize';
import type { DataAccess } from '.';
import type { Logger } from '@sap-ux/logger';
import { errorInstance, getFioriToolsDirectory } from '../utils';
import type { ServiceOptions } from '../types';
import os from 'os';
import type { Entity } from '../constants';

export const basedir = ({ baseDirectory }: { baseDirectory?: string } = {}): string => {
    if (!baseDirectory) {
        return getFioriToolsDirectory();
    } else if (path.isAbsolute(baseDirectory)) {
        return baseDirectory;
    } else {
        return path.join(os.homedir(), baseDirectory);
    }
};

class FilesystemStore<E extends object> implements DataAccess<E> {
    private readonly logger: Logger;
    private readonly storeDirectory: string;

    constructor(logger: Logger, options: ServiceOptions = {}) {
        this.logger = logger;
        this.storeDirectory = basedir(options);
    }

    public async read({ entityName, id }: { entityName: string; id: string }): Promise<undefined | E> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('read: Entity Type is falsy - ' + entityName);
            return Promise.resolve(undefined);
        }

        const { entities, error } = this._readAll(name);
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

    public async getAll({ entityName }: { entityName: string }): Promise<E[] | []> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('read: Entity Type is falsy - ' + entityName);
            return Promise.resolve([]);
        }

        const { entities, error } = this._readAll(name);
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

    public async readAll({ entityName }: { entityName: string }): Promise<{ [key: string]: E }> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('read: Entity Type is falsy - ' + entityName);
            return Promise.resolve({});
        }

        const { entities, error } = this._readAll(name);
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

    public async write({
        entityName,
        id,
        entity
    }: {
        entityName: string;
        id: string;
        entity: E;
    }): Promise<undefined | E> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('write: Entity is falsy - ' + name);
            return Promise.resolve(undefined);
        }

        const { entities = {}, error } = this._readAll(name);
        if (error && error.code !== 'ENOENT') {
            throw error;
        }

        entities[id] = entity;
        this.writeToFile(name, entities);
        return Promise.resolve(entity);
    }

    async del({ entityName, id }: { entityName: string; id: string }): Promise<boolean> {
        const name = toPersistenceName(entityName);
        if (!name) {
            this.logger.debug('delete: Entity is falsy - ' + name);
            return Promise.resolve(false);
        }

        const { entities = {}, error } = this._readAll(name);
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

    private _readAll(entityName: string): { entities?: { [key: string]: E }; error?: Error & { code?: string } } {
        let rawContents: string;
        try {
            const configPath = path.join(this.storeDirectory, `${entityName}.json`);
            if (existsSync(configPath)) {
                rawContents = readFileSync(configPath).toString().trim();
            } else {
                rawContents = '';
            }
        } catch (e) {
            const err = errorInstance(e);
            this.logger.debug(err.message);
            return { error: err };
        }

        if (!rawContents) {
            return { entities: undefined };
        }

        let entities: { [key: string]: E } | undefined;
        try {
            entities = JSON.parse(rawContents)?.[entityName];
        } catch (e) {
            return { error: errorInstance(e) };
        }

        return { entities };
    }

    private writeToFile(entityName: string, entities: { [key: string]: E }): void {
        const data = JSON.stringify({ [entityName]: entities }, null, 2);
        const filename = getEntityFileName(entityName);
        try {
            writeFileSync(path.join(this.storeDirectory, filename), data);
        } catch (e) {
            const err = errorInstance(e);
            if (err?.code === 'ENOENT') {
                this.logger.debug(`Base directory [${this.storeDirectory}] does not exist, trying to create it`);
                mkdirSync(this.storeDirectory, { recursive: true });
                writeFileSync(path.join(this.storeDirectory, filename), data);
            } else {
                throw e;
            }
        }
    }
}

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
    callback: (entityName: string) => void,
    options: ServiceOptions = {}
): FSWatcher | undefined {
    const watchPath = path.join(basedir(options), getEntityFileName(entityName));
    if (existsSync(watchPath)) {
        return fs.watch(watchPath, undefined, () => {
            callback(entityName);
        });
    } else {
        console.warn(`File Not Found: ${watchPath}`);
        return undefined;
    }
}

/**
 * Filesystem store. The entity is stored in JSON format (don't depend on the format, this could change).
 * The entity is stored in a file named with the plural form of the entity name in the base directory. Again, this is an
 * implementation detail, please don't depend on it.
 */
export function getFilesystemStore<E extends object>(logger: Logger, options?: ServiceOptions): DataAccess<E> {
    return new FilesystemStore<E>(logger, options);
}
