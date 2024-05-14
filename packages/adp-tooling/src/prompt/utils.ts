import type { ManifestNamespace } from '@sap-ux/project-access';
import type { DataSource } from '../types';

type KeyValueString = { [key: string]: string };

/**
 * Gets the data sources that are of type OData.
 *
 * @param {{ [k: string]: ManifestNamespace.DataSource } | undefined} dataSources - The data sources from the manifest.
 * @returns {DataSource[]} - The data sources that are of type OData.
 */
export function getTargetDataSources(
    dataSources: { [k: string]: ManifestNamespace.DataSource } | undefined
): DataSource[] {
    if (!dataSources) {
        return [];
    }
    return Object.entries(dataSources)
        .filter((dS) => dS[1]?.type === 'OData')
        .map((dS) => {
            return {
                dataSourceName: dS[0],
                uri: dS[1]?.uri,
                annotations: dS[1]?.settings?.annotations ?? []
            };
        });
}

/**
 * Gets the data sources that are of type ODataAnnotation.
 *
 * @param {{ [k: string]: ManifestNamespace.DataSource } | undefined} dataSources - The data sources from the manifest.
 * @returns { KeyValueString } - The data sources that are of type ODataAnnotation.
 */
export function getTargetODataAnnotations(
    dataSources: { [k: string]: ManifestNamespace.DataSource } | undefined
): KeyValueString {
    const annotations: { [key: string]: string } = {};
    if (!dataSources) {
        return annotations;
    }
    return Object.entries(dataSources)
        .filter((dS) => dS[1]?.type === 'ODataAnnotation')
        .reduce((annotations, dS) => {
            annotations[dS[0]] = dS[1]?.uri;
            return annotations;
        }, annotations);
}

/**
 * Gets the data sources that are of type ODataAnnotation.
 *
 * @param {DataSource[]} dataSources - The data sources from the manifest.
 * @returns {KeyValueString} - The data sources dictionary.
 */
export function getDataSourcesDictionary(dataSources: DataSource[]): KeyValueString {
    return Object.assign(
        {},
        ...dataSources.map((s) => ({ [s.dataSourceName]: s.annotations.length > 0 ? s.annotations[0] : undefined }))
    );
}

/**
 * Gets the data services with URI from the data sources.
 *
 * @param {DataSource[]} dataSources - The data sources from the manifest.
 * @returns {KeyValueString} - The data sources dictionary.
 */
export function getDataServicesWithURI(dataSources: DataSource[]): KeyValueString {
    return Object.assign({}, ...dataSources.map((s) => ({ [s.dataSourceName]: s.uri })));
}
