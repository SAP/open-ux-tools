import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

/**
 * Get the main service data source name from manifest.json.
 *
 * @param manifest - Parsed manifest.json
 * @returns - data source name from manifest.json
 */
function getMainServiceDataSourceName(manifest: Manifest): string | undefined {
    const modelName = manifest['sap.ovp']?.globalFilterModel ?? '';
    return manifest['sap.ui5']?.models?.[modelName] ? manifest['sap.ui5'].models[modelName].dataSource : undefined;
}

/**
 * Get the main service data source entry from manifest.json.
 *
 * @param manifest - Parsed manifest.json
 * @returns - data source entry from manifest.json, parsed
 */
export function getMainServiceDataSource(manifest: Manifest): ManifestNamespace.DataSource | undefined {
    let dataSource;
    const dataSourceName = getMainServiceDataSourceName(manifest);
    if (dataSourceName) {
        dataSource = manifest['sap.app'].dataSources?.[dataSourceName];
    }
    return dataSource;
}

/**
 * Get the data sources of type 'OData' from manifest.
 *
 * @param manifest - the parsed manifest.json
 * @param dataSourceType - optional to specify the type of OData sources to filter
 * @returns data sources of type 'OData'
 */
export function getODataSources(
    manifest: Manifest,
    dataSourceType: ManifestNamespace.DataSourceEnum['type'] = 'OData'
): { [k: string]: ManifestNamespace.DataSource } {
    const result: { [k: string]: ManifestNamespace.DataSource } = {};
    const dataSources = manifest['sap.app']?.dataSources ?? {};
    for (const dataSource in dataSources) {
        if (dataSources[dataSource].uri && dataSources[dataSource].type === dataSourceType) {
            result[dataSource] = dataSources[dataSource];
        }
    }
    return result;
}
