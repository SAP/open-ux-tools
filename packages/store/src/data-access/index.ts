import { Logger } from '../utils';

export interface DataAccess<Entity> {
    read(options: { entityName: string; id: string }): Promise<undefined | Entity>;

    write(options: { entityName: string; id: string; entity: Entity }): Promise<undefined | Entity>;

    del(options: { entityName: string; id: string }): Promise<boolean>;

    /** Return an array of entities */
    getAll(options: { entityName: string }): Promise<Entity[]>;

    /** Return entities as an object keyed by ID */
    readAll(options: { entityName: string }): Promise<{ [key: string]: Entity }>;
}

export interface DataAccessConstructor<Entity> {
    new (logger: Logger): DataAccess<Entity>;
}

export { getFilesystemWatcherFor } from './filesystem';
