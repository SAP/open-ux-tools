export interface Service<Entity, EntityKey> {
    read(key: EntityKey): Promise<Entity | undefined>;
    write(entity: Entity): Promise<Entity | undefined>;
    partialUpdate(key: EntityKey, entity: Partial<Entity>): Promise<Entity | undefined>;
    delete(entity: Entity): Promise<boolean>;
    getAll(): Promise<Entity[] | []>;
}

export { SystemService } from './backend-system';
