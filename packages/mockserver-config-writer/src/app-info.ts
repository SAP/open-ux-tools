import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

/**
 * Get the main service data source entry from manifest.json.
 *
 * @param manifest - Parsed manifest.json
 * @returns - data source entry from manifest.json, parsed
 */
export function getMainServiceDataSource(manifest: Manifest): ManifestNamespace.DataSource | undefined {
    let dataSource;
    const model = manifest['sap.ovp']?.globalFilterModel || '';
    const dataSourceName =
        manifest['sap.ui5'] && manifest['sap.ui5'].models && manifest['sap.ui5'].models[model]
            ? manifest['sap.ui5'].models[model].dataSource
            : undefined;
    if (dataSourceName) {
        dataSource = manifest['sap.app'].dataSources?.[dataSourceName];
    }
    return dataSource;
}

/**
 * Get the data sources of type 'OData' from manifest.
 *
 * @param manifest - the parsed manifest.json
 * @returns data sources of type 'OData'
 */
export function getODataSources(manifest: Manifest): { [k: string]: ManifestNamespace.DataSource } {
    const result: { [k: string]: ManifestNamespace.DataSource } = {};
    const dataSources = manifest['sap.app']?.dataSources || {};
    for (const dataSource in dataSources) {
        if (dataSources[dataSource].uri && dataSources[dataSource].type === 'OData') {
            result[dataSource] = dataSources[dataSource];
        }
    }
    return result;
}
