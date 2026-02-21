import { join } from 'node:path';
import { join as joinPosix } from 'node:path/posix';
import type { ValueListReference } from './types/adapter';
import { readFile } from 'node:fs/promises';

/**
 * Reads the metadata of external services based on the provided definitions and returns a map of the service URI to its metadata content and local file path.
 *
 * @param metadataFilePath - main metadata file path used to resolve the location of external service metadata files.
 * @param relativeBackendPath - relative path from which the external service paths are defined, used to resolve the location of external service metadata files.
 * @param externalServiceDefinitions - A map of external service definitions where the key is the target and the value is an array of references containing the annotation element, its location, and the URIs of the external services.
 * @returns A map where the key is the service URI and the value is an object containing the metadata content and the local file path.
 */
export async function readExternalServiceMetadata(
    metadataFilePath: string,
    relativeBackendPath: string,
    externalServiceDefinitions: Map<string, ValueListReference[]>
): Promise<Map<string, { data: string; localFilePath: string }>> {
    const externalServices = new Map<string, { data: string; localFilePath: string }>();
    for (const [target, references] of externalServiceDefinitions.entries()) {
        for (const reference of references) {
            for (const value of reference.uris) {
                const relativeServicePath = getRelativeServicePath(relativeBackendPath, value);
                const serviceRoot = join(
                    metadataFilePath,
                    '..',
                    relativeServicePath,
                    target
                        .split('/')
                        .map((segment) => segment.split('.').pop())
                        .join('/')
                );

                const metadataPath = join(serviceRoot, `metadata.xml`);
                const data = await readFile(metadataPath, 'utf-8');
                externalServices.set(value, { data, localFilePath: metadataPath });
            }
        }
    }
    return externalServices;
}

function getRelativeServicePath(backendPath: string, relativeExternalServicePath: string): string {
    const externalServiceMetadataPath = joinPosix(backendPath, relativeExternalServicePath.replace('/$metadata', ''));
    const [valueListServicePath] = externalServiceMetadataPath.split(';');
    const segments = valueListServicePath.split('/');
    let prefix = '/';
    let currentSegment = segments.shift();
    while (currentSegment !== undefined) {
        const next = joinPosix(prefix, currentSegment);
        if (!backendPath.startsWith(next)) {
            break;
        }
        prefix = next;
        currentSegment = segments.shift();
    }
    return valueListServicePath.replace(prefix, '');
}
