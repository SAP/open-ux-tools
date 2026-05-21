import { dirname, join } from 'node:path';
import type { Manifest, ManifestNamespace, ServiceSpecification } from '../types';
import { readJSON } from '../file';
import type { Editor } from 'mem-fs-editor';

export interface UsedEntity {
    service: string;
    entity: string;
}

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
 * @param manifestPath - path to manifest.json
 * @param manifest - optionally, parsed content of manifest.json, pass to avoid reading it again.
 * @param memFs - optional mem-fs-editor instance
 * @returns - service and annotation specification
 */
export async function getServicesAndAnnotations(
    manifestPath: string,
    manifest: Manifest,
    memFs?: Editor
): Promise<{ [index: string]: ServiceSpecification }> {
    const parsedManifest = manifest ?? (await readJSON<Manifest>(manifestPath, memFs));
    const manifestFolder = dirname(manifestPath);

    const services: { [index: string]: ServiceSpecification } = {};
    const dataSources = parsedManifest?.['sap.app']?.dataSources ?? {};
    for (const name in dataSources) {
        if (dataSources[name].type !== 'OData') {
            continue;
        }
        services[name] = getServiceSpecification(manifestFolder, name, dataSources);
    }
    return services;
}

/**
 * Get the service specification for a given service.
 *
 * @param webappFolder - relative path to webapp folder from project root
 * @param name - name of the service
 * @param dataSources - dataSources from manifest
 * @returns - service specification
 */
function getServiceSpecification(
    webappFolder: string,
    name: string,
    dataSources: { [k: string]: ManifestNamespace.DataSource }
): Partial<ServiceSpecification> {
    const dataSource = dataSources[name];
    const uri = dataSource.uri;
    const local =
        typeof dataSource.settings?.localUri === 'string'
            ? join(webappFolder, (dataSource.settings as ManifestNamespace.Setting).localUri as string)
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
                    local: annotation.settings?.localUri ? join(webappFolder, annotation.settings.localUri) : undefined
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

/**
 * Filters data sources by type.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - Data sources from the manifest.
 * @param {string} type - Data source type to filter by.
 * @returns {Record<string, ManifestNamespace.DataSource>} Data source IDs.
 */
export function filterDataSourcesByType(
    dataSources: Record<string, ManifestNamespace.DataSource>,
    type: string
): Record<string, ManifestNamespace.DataSource> {
    return Object.fromEntries(Object.entries(dataSources).filter(([, data]) => data.type === type));
}

/**
 * Extracts view paths from target settings if present.
 *
 * @param settings - target settings object
 * @returns - array of view path entries, or empty array if not present
 */
function getViewPaths(settings: object): unknown[] {
    if (
        'views' in settings &&
        settings.views &&
        typeof settings.views === 'object' &&
        'paths' in settings.views &&
        Array.isArray(settings.views.paths)
    ) {
        return settings.views.paths;
    }
    return [];
}

/**
 * Find used service entities by analyzing manifest.json
 * Currently we do not return entities for Fiori element V2 apps and entities for Fiori Elements V4 apps that use contextPath instead of entitySet
 *
 * @param manifest - parsed manifest.json
 * @returns - array of used entities, each with service URI and entity name
 */
export function getUsedEntitiesFromManifest(manifest: Manifest): UsedEntity[] {
    const targets = manifest['sap.ui5']?.routing?.targets;
    if (!targets || typeof targets !== 'object') {
        return [];
    }
    const mainService = getMainService(manifest) ?? '';
    const mainServiceUri = manifest['sap.app']?.dataSources?.[mainService]?.uri ?? '';
    const seen = new Set<string>();
    const usedEntities: UsedEntity[] = [];

    const addEntity = (entitySet: unknown): void => {
        if (typeof entitySet !== 'string') {
            return;
        }
        const key = `${mainServiceUri}${entitySet}`;
        if (!seen.has(key)) {
            seen.add(key);
            usedEntities.push({ service: mainServiceUri, entity: entitySet });
        }
    };

    for (const targetName in targets) {
        const target = targets[targetName];
        // Resolve settings object with multiple safe checks
        const settings =
            target.options && typeof target.options === 'object' && 'settings' in target.options
                ? target.options.settings
                : undefined;
        if (!settings || typeof settings !== 'object') {
            continue;
        }
        // Resolve entitySet from page
        if ('entitySet' in settings) {
            addEntity(settings.entitySet);
        }
        // Resolve entitySet from page views
        const viewPaths = getViewPaths(settings);
        for (const path of viewPaths) {
            if (path && typeof path === 'object' && 'entitySet' in path) {
                addEntity(path.entitySet);
            }
        }
    }
    return usedEntities;
}
