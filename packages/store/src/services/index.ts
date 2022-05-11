/**
 * The external API to read/write the entity. This layer takes care of interrelated entities, if any and any other
 * auxillary functions (migration/logging/authorization, etc)
 */
export interface Service<Entity, EntityKey> {
    read(key: EntityKey): Promise<Entity | undefined>;
    write(entity: Entity): Promise<Entity | undefined>;
    partialUpdate(key: EntityKey, entity: Partial<Entity>): Promise<Entity | undefined>;
    delete(entity: Entity): Promise<boolean>;
    getAll(): Promise<Entity[] | []>;
}

export { SystemService } from './backend-system';
export { ApiHubSettingsService } from './api-hub';
