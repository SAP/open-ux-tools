import type { EntitySetData, ExternalService } from '@sap-ux/axios-extension';
import type { ExternalServiceConfig } from '@sap-ux/fiori-generator-shared';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/**
 * Returns inline XML, or reads and returns the contents of the file at the given path.
 */
export function resolveMetadata(metadata: string): string {
    if (metadata.trimStart().startsWith('<')) {
        return metadata;
    }
    const filePath = isAbsolute(metadata) ? metadata : resolve(process.cwd(), metadata);
    if (!existsSync(filePath)) {
        throw new Error(`Metadata file not found: ${filePath}`);
    }
    return readFileSync(filePath, 'utf-8');
}

/**
 * Returns an inline array, or reads and parses the JSON file at the given path.
 */
export function resolveEntityData(entityData: EntitySetData[] | string): EntitySetData[] {
    if (Array.isArray(entityData)) {
        return entityData;
    }
    const filePath = isAbsolute(entityData) ? entityData : resolve(process.cwd(), entityData);
    if (!existsSync(filePath)) {
        throw new Error(`Entity data file not found: ${filePath}`);
    }
    return JSON.parse(readFileSync(filePath, 'utf-8')) as EntitySetData[];
}

/**                                                                                                                                                                                                                                                                         
 * Resolves metadata and entityData entries based on their content.                                                                                                                                                                       
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
