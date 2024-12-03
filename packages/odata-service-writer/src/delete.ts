import { dirname, join, normalize, posix } from 'path';
import { t } from './i18n';
import type { Editor } from 'mem-fs-editor';
import type { ManifestNamespace, Manifest } from '@sap-ux/project-access';
import type { CdsAnnotationsInfo, EdmxAnnotationsInfo } from './types';

/**
 * Removes the cds index or service file with the provided annotations.
 * This function takes an Editor instance and cds annotations
 * and deletes either from the index file or the service file with the given annotations.
 *
 * @param {Editor} fs - The memfs editor instance
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
async function removeCdsIndexOrServiceFile(fs: Editor, annotations: CdsAnnotationsInfo): Promise<void> {
    const dirPath = join(annotations.projectName, 'annotations');
    const annotationPath = normalize(dirPath).split(/[\\/]/g).join(posix.sep);
    const annotationConfig = `\nusing from './${annotationPath}';`;
    // Get index and service file paths
    const indexFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'index.cds');
    const serviceFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'services.cds');
    // Remove annotation config from index or service file
    if (indexFilePath && fs.exists(indexFilePath)) {
        // Read old annotations content and replace it with empty string
        const initialIndexContent = fs.read(indexFilePath);
        const updatedContent = initialIndexContent.replace(annotationConfig, '');
        fs.write(indexFilePath, updatedContent);
    } else if (fs.exists(serviceFilePath)) {
        // Read old annotations content and replace it with empty string
        const initialServiceFileContent = fs.read(serviceFilePath);
        const updatedContent = initialServiceFileContent.replace(annotationConfig, '');
        fs.write(serviceFilePath, updatedContent);
    }
}

/**
 * Removes annotations from CDS files.
 * This function takes cds annotations and an Editor instance,
 * then updates the relevant cds files with the given annotations.
 *
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @param {Editor} fs - The memfs editor instance
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
export async function removeAnnotationsFromCDSFiles(
    annotations: CdsAnnotationsInfo | CdsAnnotationsInfo[],
    fs: Editor
): Promise<void> {
    if (Array.isArray(annotations)) {
        for (const annotationName in annotations) {
            const annotation = annotations[annotationName];
            const annotationCdsPath = join(
                annotation.projectPath,
                annotation.appPath ?? '',
                annotation.projectName,
                'annotations.cds'
            );
            // Remove from annotations.cds file
            if (fs.exists(annotationCdsPath)) {
                // Read old annotations content and replace it with empty string
                const initialCDSContent = fs.read(annotationCdsPath);
                const updatedContent = initialCDSContent.replace(annotation.cdsFileContents, '');
                fs.write(annotationCdsPath, updatedContent);
            }
            await removeCdsIndexOrServiceFile(fs, annotation);
        }
    } else {
        const annotationCdsPath = join(
            annotations.projectPath,
            annotations.appPath ?? '',
            annotations.projectName,
            'annotations.cds'
        );
        // Write into annotations.cds file
        if (fs.exists(annotationCdsPath)) {
            // Read old annotations content and replace it with empty string
            const initialCDSContent = fs.read(annotationCdsPath);
            const updatedContent = initialCDSContent.replace(annotations.cdsFileContents, '');
            fs.write(annotationCdsPath, updatedContent);
        }
        await removeCdsIndexOrServiceFile(fs, annotations);
    }
}

/**
 * Removes annotation XML files for EDMX annotations.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {string} serviceName - Name of The OData service.
 * @param {OdataService} edmxAnnotations - The OData service annotations.
 */
export function removeAnnotationXmlFiles(
    fs: Editor,
    basePath: string,
    serviceName: string,
    edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
): void {
    // Write annotation xml if annotations are provided and service type is EDMX
    if (Array.isArray(edmxAnnotations)) {
        for (const annotationName in edmxAnnotations) {
            const annotation = edmxAnnotations[annotationName];
            const pathToAnnotationFile = join(
                basePath,
                'webapp',
                'localService',
                serviceName,
                `${annotation.technicalName}.xml`
            );
            if (fs.exists(pathToAnnotationFile)) {
                fs.delete(pathToAnnotationFile);
            }
        }
    } else if (edmxAnnotations?.xml) {
        const pathToAnnotationFile = join(
            basePath,
            'webapp',
            'localService',
            serviceName,
            `${edmxAnnotations.technicalName}.xml`
        );
        if (fs.exists(pathToAnnotationFile)) {
            fs.delete(pathToAnnotationFile);
        }
    }
}

/**
 * Internal function that removes files related to dataSource.
 *
 * @param fs - the memfs editor instance
 * @param manifestPath - the root path of an existing UI5 application
 * @param dataSource - name of the OData service instance
 */
function removeFileForDataSource(fs: Editor, manifestPath: string, dataSource: ManifestNamespace.DataSource): void {
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
 * Internal function that removes annotation files related to service.
 *
 * @param fs - the memfs editor instance
 * @param manifestPath - the root path of an existing UI5 application
 * @param annotations - annotations list
 * @param dataSources - list of dataSources from manifest.json
 */
function removeAnnotations(
    fs: Editor,
    manifestPath: string,
    annotations: string[],
    dataSources?: { [k: string]: ManifestNamespace.DataSource }
): void {
    for (const datasourceKey of annotations) {
        const annotationDatasource = dataSources?.[datasourceKey];
        if (annotationDatasource?.type === 'ODataAnnotation') {
            if (annotationDatasource.uri === annotationDatasource?.settings?.localUri) {
                // This is localAnnotaton file. Do not delete it.
            } else if (annotationDatasource) {
                removeFileForDataSource(fs, manifestPath, annotationDatasource);
                // delete dataSource from manifest
                delete dataSources?.[datasourceKey];
            }
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
        removeFileForDataSource(fs, manifestPath, dataSources?.[serviceName]);
    }
    const serviceSettings = dataSources?.[serviceName]?.settings;

    // Check for linked backend annotations and delete if found.
    if (serviceSettings?.annotations && serviceSettings.annotations.length > 0) {
        removeAnnotations(fs, manifestPath, serviceSettings.annotations, dataSources);
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
