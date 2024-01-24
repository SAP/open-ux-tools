import { join } from 'path';
import type { Manifest, ManifestNamespace, ServiceSpecification } from '../types';

/**
 * Get the main service name from the manifest.
 * LROP: by definition the service name can be read from the UI5 model with "" as name.
 * OVP: the main model needs to be read from the sap.ovp config and then the service can be derived.
 *
 * @param manifest - application manifest
 * @returns - main service name
 */
export function getMainService(manifest: Manifest): string | undefined {
    const model =
        typeof manifest?.['sap.ovp']?.globalFilterModel === 'string' ? manifest['sap.ovp'].globalFilterModel : '';
    return typeof manifest?.['sap.ui5']?.models?.[model]?.dataSource === 'string'
        ? (manifest['sap.ui5'].models[model].dataSource as string)
        : undefined;
}

/**
 * Return the service annotation specification for a specific app.
 *
 * @param manifest - parsed content of manifest.json
 * @param relativeWebAppFolder - relative path to webapp folder from project root
 * @returns - service and annotation specification
 */
export function getServicesAndAnnotations(
    manifest: Manifest,
    relativeWebAppFolder: string
): { [index: string]: ServiceSpecification } {
    const services: { [index: string]: ServiceSpecification } = {};
    const dataSources = manifest?.['sap.app']?.dataSources ?? {};
    for (const name in dataSources) {
        if (dataSources[name].type !== 'OData') {
            continue;
        }
        services[name] = getServiceSpecification(relativeWebAppFolder, name, dataSources);
    }
    return services;
}

/**
 * Get the service specification for a given service.
 *
 * @param relativeWebAppFolder - relative path to webapp folder from project root
 * @param name - name of the service
 * @param dataSources - dataSources from manifest
 * @returns - service specification
 */
function getServiceSpecification(
    relativeWebAppFolder: string,
    name: string,
    dataSources: { [k: string]: ManifestNamespace.DataSource }
): Partial<ServiceSpecification> {
    const dataSource = dataSources[name];
    const uri = dataSource.uri;
    const local =
        typeof dataSource.settings?.localUri === 'string'
            ? join(relativeWebAppFolder, (dataSource.settings as ManifestNamespace.Setting).localUri as string)
            : '';
    const odataVersion = dataSource.settings?.odataVersion ?? '2.0';
    const annotations: { uri?: string; local?: string }[] = [];
    const annotationNames = dataSource.settings?.annotations;
    if (Array.isArray(annotationNames)) {
        for (const annotationName of annotationNames) {
            const annotation = dataSources[annotationName];
            if (annotation) {
                annotations.push({
                    uri: annotation.uri,
                    local: annotation.settings?.localUri
                        ? join(relativeWebAppFolder, annotation.settings.localUri)
                        : undefined
                });
            }
        }
    }
    return {
        uri,
        local,
        odataVersion,
        annotations
    };
}
