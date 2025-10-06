import type { Editor } from 'mem-fs-editor';
import { dirname, join, sep } from 'node:path';
import { t } from '../i18n';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { DirName, getMinimumUI5Version, getWebappPath } from '@sap-ux/project-access';
import type { DataSources, EdmxAnnotationsInfo, OdataService } from '../types';
import semVer from 'semver';

interface DataSourceUpdateSettings {
    serviceName: string;
    servicePath: string;
    serviceVersion: string;
    manifest: Manifest;
    forceServiceUpdate: boolean;
    serviceMetadata?: string;
    serviceRemoteAnnotations?: EdmxAnnotationsInfo | EdmxAnnotationsInfo[];
    serviceLocalAnnotations?: string | string[];
}

/**
 * Updates service data in manifest.json.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {DataSourceUpdateSettings} dataSourceUpdateSettings - dataSource settings for update
 */
function enhanceManifestDatasources(
    fs: Editor,
    webappPath: string,
    dataSourceUpdateSettings: DataSourceUpdateSettings
): void {
    const {
        serviceName,
        servicePath,
        serviceVersion,
        manifest,
        forceServiceUpdate,
        serviceMetadata,
        serviceRemoteAnnotations,
        serviceLocalAnnotations
    } = dataSourceUpdateSettings;
    const dataSources = manifest?.['sap.app'].dataSources ?? {};
    const createdRemoteAnnotationDataSources = addRemoteAnnotationDataSources(
        fs,
        webappPath,
        dataSources,
        serviceName,
        serviceRemoteAnnotations,
        forceServiceUpdate
    );
    const createdLocalAnnotationDataSources = addLocalAnnotationDataSources(
        dataSources,
        serviceName,
        serviceLocalAnnotations,
        forceServiceUpdate
    );
    const settings = {
        annotations: [...createdRemoteAnnotationDataSources, ...createdLocalAnnotationDataSources]
    };
    if (serviceMetadata) {
        settings['localUri'] = `localService/${serviceName}/metadata.xml`;
    }
    if (serviceVersion === '4') {
        settings['odataVersion'] = '4.0';
    } else if (serviceVersion === '2') {
        settings['odataVersion'] = '2.0';
    }
    // Create or update service dataSource in manifest.json for service
    dataSources[serviceName] = {
        uri: servicePath,
        type: 'OData',
        settings
    };
    // Update manifest.json dataSources
    manifest['sap.app'].dataSources = dataSources;
}

/**
 * Enhances manifest.json models with given service data.
 *
 * @param {string} serviceName - name of the OData service instance
 * @param {string} serviceVersion - version of the OData service instance
 * @param {string} serviceModel - model of the OData service instance
 * @param {boolean} includeSynchronizationMode - whether to include synchronizationMode for model settings
 * @param {Manifest} manifest - the manifest.json of the application
 */
function enhanceManifestModels(
    serviceName: string,
    serviceVersion: string,
    serviceModel: string,
    includeSynchronizationMode: boolean,
    manifest: Manifest
): void {
    const models = manifest?.['sap.ui5']?.models ?? {};
    let modelSettings: ManifestNamespace.Ui5Setting = {};
    if (serviceVersion === '4') {
        if (includeSynchronizationMode) {
            modelSettings['synchronizationMode'] = 'None';
        }
        modelSettings['operationMode'] = 'Server';
        modelSettings['autoExpandSelect'] = true;
        modelSettings['earlyRequests'] = true;
    }
    if (models[serviceModel]?.settings) {
        // Merge settings for existing model
        modelSettings = {
            ...models[serviceModel].settings,
            ...modelSettings
        };
        models[serviceModel] = {
            ...models[serviceModel],
            dataSource: serviceName,
            preload: true,
            settings: modelSettings
        };
    } else {
        models[serviceModel] = {
            dataSource: serviceName,
            preload: true,
            settings: modelSettings
        };
    }
    if (manifest['sap.ui5']) {
        manifest['sap.ui5'] = {
            ...manifest['sap.ui5'],
            models
        };
    } else {
        Object.assign(manifest, { 'sap.ui5': { models: { ...models } } });
    }
}

/**
 * Determines model settings based on the UI5 version.
 *
 * @param minUI5Version - The minimum UI5 version.
 * @returns updated model settings.
 */
function getModelSettings(minUI5Version: string | undefined): { includeSynchronizationMode: boolean } {
    let includeSynchronizationMode = false;
    if (minUI5Version) {
        includeSynchronizationMode = semVer.satisfies(minUI5Version, '<=1.110');
    }
    return { includeSynchronizationMode };
}

/**
 * Adds local annotations to manifest dataSources.
 *
 * @param dataSources - dataSources from manifest.json
 * @param serviceName - name of the OData service instance
 * @param {string | string[]} serviceLocalAnnotations - local annotations of the OData service instance
 * @param {boolean} useOldAnnotations - if true, uses already existing local annotations for service
 * @returns created annotation dataSources list for service.
 */
function addLocalAnnotationDataSources(
    dataSources: DataSources,
    serviceName: string,
    serviceLocalAnnotations?: string | string[],
    useOldAnnotations?: boolean
): string[] {
    const createdAnnotations: string[] = [];
    if (useOldAnnotations) {
        // Update old annotations
        const serviceAnnotations = dataSources?.[serviceName]?.settings?.annotations ?? [];
        serviceAnnotations.forEach((name) => {
            const dataSource = dataSources[name];
            // make sure we only work with local annotations for current service
            if (dataSource?.type === 'ODataAnnotation' && dataSource.uri === dataSource.settings?.localUri) {
                createdAnnotations.push(name);
            }
        });
    } else if (Array.isArray(serviceLocalAnnotations)) {
        serviceLocalAnnotations.forEach((localAnnotation: string) => {
            dataSources[localAnnotation] = {
                type: 'ODataAnnotation',
                uri: `annotations/${localAnnotation}.xml`,
                settings: {
                    localUri: `annotations/${localAnnotation}.xml`
                }
            };
            createdAnnotations.push(localAnnotation);
        });
    } else if (serviceLocalAnnotations) {
        dataSources[serviceLocalAnnotations] = {
            type: 'ODataAnnotation',
            uri: `annotations/${serviceLocalAnnotations}.xml`,
            settings: {
                localUri: `annotations/${serviceLocalAnnotations}.xml`
            }
        };
        createdAnnotations.push(serviceLocalAnnotations);
    }
    return createdAnnotations;
}

/**
 * Removes unused service annotations from manifest dataSources and unused annotation files.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param dataSources - dataSources from manifest.json
 * @param serviceName - name of the OData service instance
 * @param createdAnnotations - name of the OData service instance
 */
function removeUnusedAnnotations(
    fs: Editor,
    webappPath: string,
    dataSources: DataSources,
    serviceName: string,
    createdAnnotations: string[]
): void {
    // Clean unused annotations
    const serviceAnnotations = dataSources?.[serviceName].settings?.annotations ?? [];
    serviceAnnotations.forEach((name) => {
        const dataSource = dataSources[name];
        // make sure we only work with remote annotations for current service
        if (
            dataSource?.type === 'ODataAnnotation' &&
            dataSource.uri !== dataSource.settings?.localUri &&
            !createdAnnotations.includes(name)
        ) {
            const oldAnnotationPath = dataSource.settings?.localUri;
            // Delete old annotation files
            if (oldAnnotationPath && fs.exists(join(webappPath, oldAnnotationPath))) {
                fs.delete(join(webappPath, oldAnnotationPath));
            }
            // Delete old annotation dataSource netry
            delete dataSources[name];
        }
    });
}

/**
 * Adds remote annotations to manifest dataSources and removes unused annotations by the service.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param dataSources - dataSources from manifest.json
 * @param serviceName - name of the OData service instance
 * @param {EdmxAnnotationsInfo | EdmxAnnotationsInfo[]} serviceRemoteAnnotations - remote annotations of the OData service instance
 * @param {boolean} cleanOldAnnotations - if true, checks and updates service annotations
 * @returns created annotation dataSources list for service.
 */
function addRemoteAnnotationDataSources(
    fs: Editor,
    webappPath: string,
    dataSources: DataSources,
    serviceName: string,
    serviceRemoteAnnotations?: EdmxAnnotationsInfo | EdmxAnnotationsInfo[],
    cleanOldAnnotations?: boolean
): string[] {
    const createdAnnotations: string[] = [];
    if (Array.isArray(serviceRemoteAnnotations)) {
        serviceRemoteAnnotations.forEach((remoteAnnotation) => {
            if (remoteAnnotation.name) {
                dataSources[remoteAnnotation.name] = {
                    uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${encodeURIComponent(
                        remoteAnnotation.technicalName
                    )}',Version='0001')/$value/`,
                    type: 'ODataAnnotation',
                    settings: {
                        localUri: `localService/${serviceName}/${remoteAnnotation.name}.xml`
                    }
                };
                createdAnnotations.push(remoteAnnotation.name);
            }
        });
    } else if (serviceRemoteAnnotations?.name) {
        dataSources[serviceRemoteAnnotations.name] = {
            uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${encodeURIComponent(
                serviceRemoteAnnotations.technicalName
            )}',Version='0001')/$value/`,
            type: 'ODataAnnotation',
            settings: {
                localUri: `localService/${serviceName}/${serviceRemoteAnnotations.name}.xml`
            }
        };
        createdAnnotations.push(serviceRemoteAnnotations.name);
    }
    if (cleanOldAnnotations) {
        // Clean unused annotations
        removeUnusedAnnotations(fs, webappPath, dataSources, serviceName, createdAnnotations);
    }
    return createdAnnotations;
}

/**
 * Enhances manifest.json data with service data.
 *
 * @param {OdataService} service - the OData service instance
 * @param {Manifest} manifest - the manifest.json of the application
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} forceServiceUpdate - if true, checks and updates service annotations
 */
function enhanceManifest(
    service: OdataService,
    manifest: Manifest,
    webappPath: string,
    fs: Editor,
    forceServiceUpdate: boolean
): void {
    const minimumUi5Version = getMinimumUI5Version(manifest);
    // Enhance model settings for service
    const serviceSettings = Object.assign(service, getModelSettings(minimumUi5Version));
    if (serviceSettings.name && serviceSettings.path && serviceSettings.model !== undefined) {
        enhanceManifestDatasources(fs, webappPath, {
            serviceName: serviceSettings.name,
            servicePath: serviceSettings.path,
            serviceVersion: serviceSettings.version,
            manifest,
            forceServiceUpdate,
            serviceMetadata: serviceSettings.metadata,
            serviceRemoteAnnotations: serviceSettings.annotations as EdmxAnnotationsInfo | EdmxAnnotationsInfo[],
            serviceLocalAnnotations: serviceSettings.localAnnotationsName
        });
        // Add or update existing service model settings for manifest.json
        enhanceManifestModels(
            serviceSettings.name,
            serviceSettings.version,
            serviceSettings.model,
            serviceSettings.includeSynchronizationMode,
            manifest
        );
    }
}

/**
 * Converts service in manifest.json and moves service files in a way that is supported by multiple services.
 * If service files are defined in 'localService' folder then those files are moved to respective service folder and service configuration URI are modified in manifest.json.
 *
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {string} dataSourceKey - dataSource key in manifest.json
 * @param {ManifestNamespace.DataSource} dataSource - dataSource configuration from manifest.json
 * @param {Editor} fs - the memfs editor instance
 */
function convertSingleService(
    webappPath: string,
    dataSourceKey: string,
    dataSource: ManifestNamespace.DataSource,
    fs: Editor
): void {
    const settings = dataSource.settings;
    if (settings) {
        // "localService/metadata.xml"
        const localUri = settings.localUri;
        // -> ["localService", "metadata.xml"]
        const localUriParts = localUri ? localUri.split('/') : undefined;
        if (localUriParts && localUriParts[0] === DirName.LocalService && localUriParts.length === 2) {
            const localFileName = localUriParts[localUriParts.length - 1];
            settings.localUri = `${DirName.LocalService}/${dataSourceKey}/${localFileName}`;
            // move related files to service folder
            const fromFilePath = join(webappPath, localUriParts.join(sep));
            const toFilePath = join(webappPath, DirName.LocalService, dataSourceKey, localFileName);
            if (fs.exists(fromFilePath)) {
                fs.move(fromFilePath, toFilePath);
            }
        }
    }
}

/**
 * Converts services in manifest.json and moves services files in a way that is supported by multiple services.
 *
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {Manifest} manifest - the manifest.json of the application
 * @param {Editor} fs - the memfs editor instance
 * @returns modified manifest object.
 */
async function addMultipleServiceSupportToManifest(
    webappPath: string,
    manifest: Manifest,
    fs: Editor
): Promise<Manifest> {
    const dataSources = manifest?.['sap.app']?.dataSources;
    for (const dataSourceKey in dataSources) {
        const dataSource = dataSources[dataSourceKey];
        if (dataSource && dataSource.type === 'OData') {
            convertSingleService(webappPath, dataSourceKey, dataSource, fs);
            const annotations = dataSource.settings?.annotations;
            if (annotations) {
                annotations.forEach((annotationName) => {
                    const annotationDataSource = dataSources[annotationName];
                    if (annotationDataSource) {
                        convertSingleService(webappPath, dataSourceKey, annotationDataSource, fs);
                    }
                });
            }
        }
    }
    return manifest;
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
 * @param dataSources - dataSources from manifest.json
 */
function removeAnnotations(fs: Editor, manifestPath: string, annotations: string[], dataSources?: DataSources): void {
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
 * Internal function that deletes service from the manifest.json based on the given service data.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param service - name of the OData service instance
 * @param fs - the memfs editor instance
 */
export function deleteServiceFromManifest(basePath: string, service: OdataService, fs: Editor): void {
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
}

/**
 * Updates service data in manifest.json.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {EdmxOdataService} service - the OData service instance
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} forceServiceUpdate - if true, checks and updates service annotations
 */
export async function updateManifest(
    basePath: string,
    service: OdataService,
    fs: Editor,
    forceServiceUpdate = false
): Promise<void> {
    // Update manifest.json
    const webappPath = await getWebappPath(basePath, fs);
    const manifestPath = join(webappPath, 'manifest.json');
    // Get component app id
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    const appProp = 'sap.app';
    const appid = manifest?.[appProp]?.id;
    const dataSources = manifest[appProp]?.dataSources ?? {};
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }
    // Throw if only update is required and service is not found in manifest.json
    if (forceServiceUpdate && service.name && !dataSources?.[service.name]) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', {
                property: `'${appProp}.dataSources.${service.name}'`,
                path: manifestPath
            })
        );
    }
    // Throw if service is being added, but service with the same URI already exists
    if (
        !forceServiceUpdate &&
        service.path &&
        Object.values(dataSources).find((dataSource) => dataSource.uri === service.path)
    ) {
        throw new Error(
            t('error.requiredServiceAlreadyExists', {
                uri: service.path
            })
        );
    }
    // Check and update existing services in a way that is supported by multiple services
    const convertedManifest = await addMultipleServiceSupportToManifest(webappPath, manifest, fs);
    // Update manifest.json services
    enhanceManifest(service, convertedManifest, webappPath, fs, forceServiceUpdate);
    fs.writeJSON(manifestPath, convertedManifest);
}
