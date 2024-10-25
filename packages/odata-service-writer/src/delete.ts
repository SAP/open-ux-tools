import { dirname, join } from 'path';
import { t } from './i18n';
import type { Editor } from 'mem-fs-editor';
import type { ManifestNamespace, Manifest } from '@sap-ux/project-access';

/**
 * Internal function that deletes EDMX annotation file for given dataSource.
 *
 * @param fs - the memfs editor instance
 * @param manifestPath - the root path of an existing UI5 application
 * @param dataSource - name of the OData service instance
 */
function deleteFileForDataSource(fs: Editor, manifestPath: string, dataSource: ManifestNamespace.DataSource): void {
    const serviceSettings = dataSource.settings || {};
    if (serviceSettings?.localUri) {
        const localUriPath = join(dirname(manifestPath), serviceSettings?.localUri);
        if (fs.exists(localUriPath)) {
            // delete the local data source file
            fs.delete(localUriPath);
        }
    }
}

/**
 * Internal function that deletes service from the manifest.json based on the given service name.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param serviceName - name of the OData service instance
 * @param fs - the memfs editor instance
 */
export function deleteServiceFromManifest(basePath: string, serviceName: string, fs: Editor): void {
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    // Get component app id
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    const appProp = 'sap.app';
    const appid = manifest?.[appProp]?.id;
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }
    const dataSources = manifest?.[appProp]?.dataSources;
    if (dataSources?.[serviceName]) {
        deleteFileForDataSource(fs, manifestPath, dataSources?.[serviceName]);
    }
    const serviceSettings = dataSources?.[serviceName]?.settings;

    // Check for linked backend annotations and delete if found.
    if (serviceSettings?.annotations && serviceSettings.annotations.length > 0) {
        for (const datasourceKey of serviceSettings.annotations) {
            const annotationDatasource = dataSources?.[datasourceKey];
            if (annotationDatasource?.type === 'ODataAnnotation') {
                if (annotationDatasource.uri === annotationDatasource?.settings?.localUri) {
                    // This is localAnnotaton file. Do not delete it.
                } else if (annotationDatasource) {
                    deleteFileForDataSource(fs, manifestPath, annotationDatasource);
                    // delete dataSource from manifest
                    delete dataSources?.[datasourceKey];
                }
            }
        }
    }
    // delete dataSource from manifest
    if (dataSources?.[serviceName]) {
        delete dataSources[serviceName];
    }
    const modelsProp = 'sap.ui5';
    // delete models for this service
    const models = manifest?.[modelsProp]?.models;
    if (models) {
        for (const modelKey of Object.keys(models)) {
            const modelObj = models[modelKey];
            if (modelObj?.dataSource === serviceName) {
                delete models[modelKey];
            }
        }
    }
    fs.writeJSON(manifestPath, manifest);
}
