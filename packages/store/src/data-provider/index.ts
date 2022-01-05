import { Logger } from '../utils';
import { EntityKey } from '../entities';
import { ServiceOptions } from '../types';

export interface DataProvider<E, K extends EntityKey> {
    read(key: K): Promise<E | undefined>;
    write(entity: E): Promise<E | undefined>;
    delete(entity: E): Promise<boolean>;
    getAll(): Promise<E[] | []>;
}

export interface DataProviderConstructor<E, K extends EntityKey> {
    new (logger: Logger, options?: ServiceOptions): DataProvider<E, K>;
}
