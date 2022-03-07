import type { Logger } from '@sap-ux/logger';
import type { EntityKey } from '../entities';
import type { ServiceOptions } from '../types';

/**
 * Data provider for an entity. It is responsible for reading
 * and writing the entity. This is meant to abstract the medium the entity is written to/read from - the data
 * could be written to the filesystem/OS secure store/network share, the client does not need to know this.
 */
export interface DataProvider<E, K extends EntityKey> {
    read(key: K): Promise<E | undefined>;
    write(entity: E): Promise<E | undefined>;
    delete(entity: E): Promise<boolean>;
    getAll(): Promise<E[] | []>;
}

export interface DataProviderConstructor<E, K extends EntityKey> {
    new (logger: Logger, options?: ServiceOptions): DataProvider<E, K>;
}
