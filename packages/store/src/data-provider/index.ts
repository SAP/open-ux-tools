import { Logger } from '../utils';
import { EntityKey } from '../entities';

export interface DataProvider<E, K extends EntityKey<E>> {
    read(key: K): Promise<E | undefined>;
    write(entity: E): Promise<E | undefined>;
    delete(entity: E): Promise<boolean>;
    getAll(): Promise<E[] | []>;
}

export interface DataProviderConstructor<E, K extends EntityKey<K>> {
    new (logger: Logger): DataProvider<E, K>;
}
