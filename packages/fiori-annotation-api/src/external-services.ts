import { join, join as joinPosix } from 'node:path';
import type { ValueListReference } from './types/adapter';
import { readFile } from 'node:fs/promises';

/**
 *
 * @param externalServiceDefinitions
 * @returns
 */
export async function readExternalServiceMetadata(
    metadataFilePath: string,
    relativeBackendPath: string,
    externalServiceDefinitions: Map<string, ValueListReference[]>
): Promise<Map<string, string>> {
    const externalServices = new Map<string, string>();
    // const cachePath = dirname(metadataFilePath);
    for (const [target, references] of externalServiceDefinitions.entries()) {
        for (const reference of references) {
            for (const value of reference.uris) {
                // const relativeServicePath = getRelativeServicePath('', value);
                const relativeServicePath = getRelativeServicePath(relativeBackendPath, value);
                const serviceRoot = join(
                    metadataFilePath,
                    '..',
                    relativeServicePath,
                    target
                        .split('/')
                        .map((segment) => segment.split('.').slice(-1)[0])
                        .join('/')
                );
                // const serviceRoot = join('', '..', relativeServicePath, target);
                const metadataPath = join(serviceRoot, `metadata.xml`);
                const data = await readFile(metadataPath, 'utf-8');
                externalServices.set(value, data);
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
