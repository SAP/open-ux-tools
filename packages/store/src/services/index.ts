import type { BackendSystem } from '../entities/backend-system';
import type { SystemType } from '../types';

export interface BackendServiceRetrievalOptions extends ServiceRetrievalOptions {
    /**
     * List of system types to be included in the returned backend systems
     */
    includeSystemTypes: SystemType[];
}

export interface ServiceRetrievalOptions {
    includeSensitiveData?: boolean;
}

type ServiceGetAllOptions<T> = T extends BackendSystem ? BackendServiceRetrievalOptions : ServiceRetrievalOptions;

/**
 * The external API to read/write the entity. This layer takes care of interrelated entities, if any and any other
 * auxillary functions (migration/logging/authorization, etc)
 */
export interface Service<Entity, EntityKey> {
    /**
     * Reads the entity identified by the given key.
     *
     * @param key - the key identifying the entity to read
     * @throws error - if the read operation fails
     * @return The read entity or undefined if not found
     */
    read(key: EntityKey): Promise<Entity | undefined>;
    /**
     * Writes the entity.
     *
     * @param entity - the entity to write
     * @param options - additional options for writing the entity
     * @throws error - if the write operation fails
     * @return The written entity or undefined if the operation failed
     */
    write(entity: Entity, options?: unknown): Promise<Entity | undefined>;
    /**
     * Partially updates the entity identified by the given key with the provided properties.
     *
     * @param key - the key identifying the entity to update
     * @param entity - the partial entity containing properties to update
     * @throws error - if the update operation fails
     * @return The updated entity or undefined if the operation failed
     */
    partialUpdate(key: EntityKey, entity: Partial<Entity>): Promise<Entity | undefined>;
    /**
     * Deletes the specified entity.
     *
     * @param entity - the entity to delete
     * @throws error - if the delete operation fails
     * @return true if the entity was deleted, false otherwise
     */
    delete(entity: Entity): Promise<boolean>;
    /**
     * Retrieves all entities.
     *
     * @param options - options for retrieving entities
     * @throws error - if the retrieval operation fails
     * @return An array of entities or an empty array if none exist
     */
    getAll(options?: ServiceGetAllOptions<Entity>): Promise<Entity[] | []>;
}

export type { SystemService } from './backend-system';
export { ApiHubSettingsService } from './api-hub';
