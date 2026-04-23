import { join } from 'node:path';
import { join as joinPosix } from 'node:path/posix';
import type { ValueListReference } from './types/adapter';
import { readFile, access, constants } from 'node:fs/promises';

/**
 * Adapts the given segment by removing the alias or namespace, or replacing alias with the namespace in action or function parameters.
 *
 * @param segment - The segment to adapt, which is a part of the metadata path for an external service.
 * @param namespace - The namespace of the annotation file where the external service reference is defined.
 * @param alias - The alias of the annotation file where the external service reference is defined, if any.
 * @returns - The adapted segment with the alias or namespace removed, or alias replaced with the namespace in action or function parameters.
 */
function adaptSegment(segment: string, namespace: string, alias: string | undefined): string {
    const [base, ...params] = segment.split('(');
    let adaptedSegment = base.split('.').pop() ?? '';
    if (params.length) {
        const adaptedParams = params
            .join('(')
            .split(',')
            .map((param) => {
                let adaptedParam = param;
                let isCollection = false;
                if (param.includes('Collection(')) {
                    isCollection = true;
                    adaptedParam = param.replace('Collection(', '');
                }
                const padding = new RegExp(/^\s*/).exec(adaptedParam)?.[0] ?? '';
                const paramText = adaptedParam.trim();
                const segments = paramText.split('.');
                adaptedParam = segments.pop()!;
                if (segments.length) {
                    let prefix = segments.join('.').trim();
                    prefix = prefix === namespace || (alias && prefix === alias) ? namespace : prefix;
                    adaptedParam = padding + prefix + '.' + adaptedParam;
                }
                if (isCollection) {
                    adaptedParam = 'Collection(' + adaptedParam;
                }
                return adaptedParam;
            })
            .join(',');
        adaptedSegment += '(' + adaptedParams;
    }
    return adaptedSegment;
}

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
                        .map((segment) => adaptSegment(segment, reference.namespace, reference.alias))
                        .join('/')
                );

                const metadataPath = join(serviceRoot, `metadata.xml`);

                let exists;
                try {
                    await access(metadataPath, constants.R_OK);
                    exists = true;
                } catch {
                    exists = false;
                }
                const data = exists ? await readFile(metadataPath, 'utf-8') : '';
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
