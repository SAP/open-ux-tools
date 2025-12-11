import type { ServiceOptions } from '../types';
import type { Logger } from '@sap-ux/logger';

/**
 * This interface represents the target the data gets written to/read from. It abstracts implementation details
 * related to the medium used (locking, buffering, etc)
 */
export interface DataAccess<Entity> {
    read(options: { entityName: string; id: string }): Promise<undefined | Entity>;

    write(options: { entityName: string; id: string; entity: Entity }): Promise<undefined | Entity>;

    del(options: { entityName: string; id: string }): Promise<boolean>;

    /** Return an array of entities */
    getAll(options: { entityName: string; includeSensitiveData?: boolean }): Promise<Entity[]>;

    /** Return entities as an object keyed by ID */
    readAll(options: { entityName: string; includeSensitiveData?: boolean }): Promise<{ [key: string]: Entity }>;

    /** Updates chosen entity */
    partialUpdate(options: { entityName: string; id: string; entity: Partial<Entity> }): Promise<undefined | Entity>;
}

export interface DataAccessConstructor<Entity> {
    new (logger: Logger, options?: ServiceOptions): DataAccess<Entity>;
}

export { getFilesystemWatcherFor } from './filesystem';
