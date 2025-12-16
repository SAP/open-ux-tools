import type { Logger } from '@sap-ux/logger';
import type { EntityKey } from '../entities';
import type { BackendSerializableKeys, ServiceOptions } from '../types';
import type { BackendSystem } from '../entities/backend-system';

/**
 * The backend system keys and their values to filter backend systems by.
 */
export type BackendSystemFilter = Partial<{ [K in BackendSerializableKeys]: BackendSystem[K] }>;

/**
 * Specifies options for retrieving backend systems from the data provider.
 */
export interface BackendProviderRetrievalOptions {
    includeSensitiveData?: boolean;
    backendSystemFilter?: BackendSystemFilter;
}

/**
 * Options for the getAll method of a data provider.
 */
export type ProviderGetAllOptions<T> = T extends BackendSystem ? BackendProviderRetrievalOptions : null;

/**
 * Data provider for an entity. It is responsible for reading
 * and writing the entity. This is meant to abstract the medium the entity is written to/read from - the data
 * could be written to the filesystem/OS secure store/network share, the client does not need to know this.
 */
export interface DataProvider<E, K extends EntityKey> {
    read(key: K): Promise<E | undefined>;
    write(entity: E): Promise<E | undefined>;
    delete(entity: E): Promise<boolean>;
    /**
     * Returns the data as an array related to the entity.
     *
     * @param options - Options for retrieving data.
     */
    getAll(options?: ProviderGetAllOptions<E>): Promise<E[] | []>;
}

export interface DataProviderConstructor<E, K extends EntityKey> {
    new (logger: Logger, options?: ServiceOptions): DataProvider<E, K>;
}
