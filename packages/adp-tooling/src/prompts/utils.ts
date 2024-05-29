import type { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Gets data source IDs of the OData services.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - Data sources from the manifest.
 * @returns {string[]} Data source IDs.
 */
export function getDataSourceIds(dataSources: Record<string, ManifestNamespace.DataSource>): string[] {
    const dataSourcesOData = filterDataSourcesByType(dataSources, 'OData');
    return Object.keys(dataSourcesOData);
}

/**
 * Filters data sources by type.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - Data sources from the manifest.
 * @param {string} type - Data source type.
 * @returns {Record<string, ManifestNamespace.DataSource>} Data source IDs.
 */
export function filterDataSourcesByType(
    dataSources: Record<string, ManifestNamespace.DataSource>,
    type: string
): Record<string, ManifestNamespace.DataSource> {
    return Object.fromEntries(Object.entries(dataSources).filter(([, data]) => data.type === type));
}
