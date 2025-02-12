import { dirname, join, normalize, posix } from 'path';
import { t } from './i18n';
import type { Editor } from 'mem-fs-editor';
import type { ManifestNamespace, Manifest } from '@sap-ux/project-access';
import type { CdsAnnotationsInfo, EdmxAnnotationsInfo, OdataService, ProjectPaths } from './types';
import { UI5Config } from '@sap-ux/ui5-config';

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
    const serviceSettings = dataSource.settings ?? {};
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
 * Returns all paths of the EDMX service annotations.
 *
 * @param {OdataService} edmxAnnotations - EDMX OData service annotations.
 * @returns {string} annotation paths.
 */
function getEDMXAnnotationPaths(edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]): string[] {
    const emdxAnnotationsPaths: string[] = [];
    if (Array.isArray(edmxAnnotations)) {
        edmxAnnotations.forEach((annotation: EdmxAnnotationsInfo) => {
            const technicalName = encodeURIComponent(annotation.technicalName);
            emdxAnnotationsPaths.push(
                `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${technicalName}',Version='0001')/$value/` // This is how annotation paths are stored in manifest for ODataAnnotations
            );
        });
    } else {
        const technicalName = encodeURIComponent(edmxAnnotations.technicalName);
        emdxAnnotationsPaths.push(
            `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${technicalName}',Version='0001')/$value/`
        );
    }
    return emdxAnnotationsPaths;
}

/**
 * Internal function that deletes service from the manifest.json based on the given service name.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param paths - the root path of an existing UI5 application
 * @param service - name of the OData service instance
 * @param fs - the memfs editor instance
 */
export async function deleteServiceData(
    basePath: string,
    paths: ProjectPaths,
    service: OdataService,
    fs: Editor
): Promise<void> {
    const serviceName: string = service.name ?? 'mainService';
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

    // Check for linked backend annotations and delete if found
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
    if (service.url && service.path && service.name) {
        let ui5Config: UI5Config | undefined;
        let ui5LocalConfig: UI5Config | undefined;
        let ui5MockConfig: UI5Config | undefined;
        // Delete service data from manifest.json
        if (paths.ui5Yaml) {
            ui5Config = await UI5Config.newInstance(fs.read(paths.ui5Yaml));
            // Delete service backend from fiori-tools-proxy middleware config
            ui5Config.removeBackendFromFioriToolsProxydMiddleware(service.url);
            fs.write(paths.ui5Yaml, ui5Config.toString());
        }
        const serviceAnnotationPaths = getEDMXAnnotationPaths(
            service.annotations as EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
        );
        if (paths.ui5LocalYaml) {
            ui5LocalConfig = await UI5Config.newInstance(fs.read(paths.ui5LocalYaml));
            // Delete service backend from fiori-tools-proxy middleware config
            ui5LocalConfig.removeBackendFromFioriToolsProxydMiddleware(service.url);
            // Delete service from mockserver middleware config
            ui5LocalConfig.removeServiceFromMockServerMiddleware(service.path, serviceAnnotationPaths);
            fs.write(paths.ui5LocalYaml, ui5LocalConfig.toString());
        }
        if (paths.ui5MockYaml) {
            ui5MockConfig = await UI5Config.newInstance(fs.read(paths.ui5MockYaml));
            // Delete service backend from fiori-tools-proxy middleware config
            ui5MockConfig.removeBackendFromFioriToolsProxydMiddleware(service.url);
            // Delete service from mockserver config
            ui5MockConfig.removeServiceFromMockServerMiddleware(service.path, serviceAnnotationPaths);
            fs.write(paths.ui5MockYaml, ui5MockConfig.toString());
        }
        removeAnnotationXmlFiles(
            fs,
            basePath,
            service.name,
            service.annotations as EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
        );
    }
}
