import type { EntitySetData, ExternalService } from '@sap-ux/axios-extension';
import type { ExternalServiceConfig } from '@sap-ux/fiori-generator-shared';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/**
 * Returns inline XML, or reads and returns the contents of the file at the given path.
 *
 * @param metadata The metadata XML string or the path to the metadata file.
 */
export function resolveMetadata(metadata: string): string {
    if (metadata.trimStart().startsWith('<')) {
        return metadata;
    }
    const filePath = isAbsolute(metadata) ? metadata : resolve(process.cwd(), metadata);
    if (!existsSync(filePath)) {
        throw new Error(`Metadata file not found: ${filePath}`);
    }
    try {
        return readFileSync(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read metadata file: ${filePath}. ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Returns an inline array, or reads and parses the JSON file at the given path.
 *
 * @param entityData The entity data array or the path to the JSON file.
 */
export function resolveEntityData(entityData: EntitySetData[] | string): EntitySetData[] {
    if (Array.isArray(entityData)) {
        return entityData;
    }
    const filePath = isAbsolute(entityData) ? entityData : resolve(process.cwd(), entityData);
    if (!existsSync(filePath)) {
        throw new Error(`Entity data file not found: ${filePath}`);
    }
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (error) {
        throw new Error(
            `Failed to read or parse entity data file: ${filePath}. ${error instanceof Error ? error.message : error}`
        );
    }
}

/**
 * Resolves metadata and entityData entries based on their content.
 *
 * @param services External service configurations.
 */
export function resolveExternalServices(services: ExternalServiceConfig[]): ExternalService[] {
    return services.map(
        (entry) =>
            ({
                ...entry,
                metadata: resolveMetadata(entry.metadata),
                entityData: entry.entityData ? resolveEntityData(entry.entityData) : undefined
            }) as ExternalService
    );
}
