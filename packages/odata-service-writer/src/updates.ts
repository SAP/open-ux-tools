import type { Editor } from 'mem-fs-editor';
import { join, normalize, posix, sep } from 'path';
import { t } from './i18n';
import type { OdataService, CdsAnnotationsInfo, EdmxAnnotationsInfo } from './types';
import semVer from 'semver';
import prettifyXml from 'prettify-xml';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { DirName, getMinimumUI5Version, getWebappPath, hasUI5CliV3 } from '@sap-ux/project-access';

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
 * Enhances manifest.json dataSources with given service data.
 *
 * @param {string} serviceName - name of the OData service instance
 * @param {string} servicePath - path of the OData service instance
 * @param {string} serviceVersion - version of the OData service instance
 * @param {Manifest} manifest - the manifest.json of the application
 * @param {string} serviceMetadata - metdata of the OData service instance
 * @param {EdmxAnnotationsInfo | EdmxAnnotationsInfo[]} serviceRemoteAnnotations - remote annotations of the OData service instance
 * @param {string | string[]} serviceLocalAnnotations - local annotations of the OData service instance
 */
function enhanceManifestDatasources(
    serviceName: string,
    servicePath: string,
    serviceVersion: string,
    manifest: Manifest,
    serviceMetadata?: string,
    serviceRemoteAnnotations?: EdmxAnnotationsInfo | EdmxAnnotationsInfo[],
    serviceLocalAnnotations?: string | string[]
): void {
    const dataSources = manifest?.['sap.app'].dataSources ?? {};
    // Service annotation names to be stored in service settings of dataSource
    const annotations: string[] = [];
    // Annotation dataSources used by service - remote and local annotations are handled differently
    const annotationDataSources: { [k: string]: ManifestNamespace.DataSource } = {};
    // Handle remote annotations used by service
    if (Array.isArray(serviceRemoteAnnotations)) {
        serviceRemoteAnnotations.forEach((remoteAnnotation) => {
            if (remoteAnnotation.name) {
                annotations.push(remoteAnnotation.name);
                annotationDataSources[remoteAnnotation.name] = {
                    uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${encodeURIComponent(
                        remoteAnnotation.technicalName
                    )}',Version='0001')/$value/`,
                    type: 'ODataAnnotation',
                    settings: {
                        localUri: `localService/${serviceName}/${remoteAnnotation.technicalName}.xml`
                    }
                };
            }
        });
    } else if (serviceRemoteAnnotations?.name) {
        annotations.push(serviceRemoteAnnotations.name);
        annotationDataSources[serviceRemoteAnnotations.name] = {
            uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='${encodeURIComponent(
                serviceRemoteAnnotations.technicalName
            )}',Version='0001')/$value/`,
            type: 'ODataAnnotation',
            settings: {
                localUri: `localService/${serviceName}/${serviceRemoteAnnotations.technicalName}.xml`
            }
        };
    }
    // Handle local annotations used by service
    if (Array.isArray(serviceLocalAnnotations)) {
        serviceLocalAnnotations.forEach((localAnnotation: string) => {
            annotations.push(localAnnotation);
            annotationDataSources[localAnnotation] = {
                type: 'ODataAnnotation',
                uri: `annotations/${localAnnotation}.xml`,
                settings: {
                    localUri: `annotations/${localAnnotation}.xml`
                }
            };
        });
    } else if (serviceLocalAnnotations) {
        annotations.push(serviceLocalAnnotations);
        annotationDataSources[serviceLocalAnnotations] = {
            type: 'ODataAnnotation',
            uri: `annotations/${serviceLocalAnnotations}.xml`,
            settings: {
                localUri: `annotations/${serviceLocalAnnotations}.xml`
            }
        };
    }
    const settings = {
        annotations
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
    // Create or update service annotation dataSources in manifest.json for service
    for (const name in annotationDataSources) {
        const annotationDataSource = annotationDataSources[name];
        dataSources[name] = annotationDataSource;
    }
    // Update manifest.json dataSources
    manifest['sap.app'].dataSources = dataSources;
}

/**
 * Enhances (creates or updates existing) manifest.json with service data.
 *
 * @param {OdataService} service - the OData service instance
 * @param {Manifest} manifest - the manifest.json of the application
 */
function enhanceManifest(service: OdataService, manifest: Manifest): void {
    const minimumUi5Version = getMinimumUI5Version(manifest);
    // Enhance model settings for service
    const serviceSettings = Object.assign(service, getModelSettings(minimumUi5Version));
    if (serviceSettings.name && serviceSettings.path && serviceSettings.model !== undefined) {
        enhanceManifestDatasources(
            serviceSettings.name,
            serviceSettings.path,
            serviceSettings.version,
            manifest,
            serviceSettings.metadata,
            serviceSettings.annotations as EdmxAnnotationsInfo | EdmxAnnotationsInfo[],
            serviceSettings.localAnnotationsName
        );
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
 * Modifies service in manifest.json and service files in a way that is supported by multiple services.
 * If service files are defined in 'localService' folder then those files are moved to respective service folder and service configuration URI are modified in manifest.json.
 *
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {string} dataSourceKey - dataSource key in manifest.json
 * @param {ManifestNamespace.DataSource} dataSource - dataSource configuration from manifest.json
 * @param {Editor} fs - the memfs editor instance
 */
function updateExistingService(
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
 * Modifies services in manifest.json and services files in a way that is supported by multiple services.
 *
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {Manifest} manifest - the manifest.json of the application
 * @param {Editor} fs - the memfs editor instance
 * @returns modified manifest object.
 */
async function updateExistingServices(webappPath: string, manifest: Manifest, fs: Editor): Promise<Manifest> {
    const dataSources = manifest?.['sap.app']?.dataSources;
    for (const dataSourceKey in dataSources) {
        const dataSource = dataSources[dataSourceKey];
        if (dataSource.type === 'OData') {
            updateExistingService(webappPath, dataSourceKey, dataSource, fs);
            const annotations = dataSource.settings?.annotations;
            if (annotations) {
                annotations.forEach((annotationName) => {
                    const annotationDataSource = dataSources[annotationName];
                    updateExistingService(webappPath, dataSourceKey, annotationDataSource, fs);
                });
            }
        }
    }
    return manifest;
}

/**
 * Internal function that updates the manifest.json based on the given service configuration.
 *
 * @param basePath - the root path of an existing UI5 application
 * @param service - the OData service instance
 * @param fs - the memfs editor instance
 */
export async function updateManifest(basePath: string, service: OdataService, fs: Editor): Promise<void> {
    const webappPath = await getWebappPath(basePath, fs);
    const manifestPath = join(webappPath, 'manifest.json');
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
    // Check and update existing services
    const modifiedManifest = await updateExistingServices(webappPath, manifest, fs);
    // Add or update manifest.json with service
    enhanceManifest(service, modifiedManifest);
    fs.writeJSON(manifestPath, modifiedManifest);
}

/**
 * Updates the cds index or service file with the provided annotations.
 * This function takes an Editor instance and cds annotations
 * and updates either the index file or the service file with the given annotations.
 *
 * @param {Editor} fs - The memfs editor instance
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
async function updateCdsIndexOrServiceFile(fs: Editor, annotations: CdsAnnotationsInfo): Promise<void> {
    const dirPath = join(annotations.projectName, 'annotations');
    const annotationPath = normalize(dirPath).split(/[\\/]/g).join(posix.sep);
    const annotationConfig = `\nusing from './${annotationPath}';`;
    // get index and service file paths
    const indexFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'index.cds');
    const serviceFilePath = join(annotations.projectPath, annotations.appPath ?? '', 'services.cds');
    // extend index or service file with annotation config
    if (indexFilePath && fs.exists(indexFilePath)) {
        fs.append(indexFilePath, annotationConfig);
    } else if (fs.exists(serviceFilePath)) {
        fs.append(serviceFilePath, annotationConfig);
    } else {
        fs.write(serviceFilePath, annotationConfig);
    }
}

/**
 * Writes annotation XML files for EDMX service annotations.
 *
 * @param {Editor} fs - The memfs editor instance.
 * @param {string} basePath - The base path of the project.
 * @param {string} serviceName - Name of The OData service.
 * @param {OdataService} edmxAnnotations - The OData service annotations.
 */
export function writeAnnotationXmlFiles(
    fs: Editor,
    basePath: string,
    serviceName: string,
    edmxAnnotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[]
): void {
    // Write annotation xml if annotations are provided and service type is EDMX
    if (Array.isArray(edmxAnnotations)) {
        for (const annotationName in edmxAnnotations) {
            const annotation = edmxAnnotations[annotationName];
            if (annotation?.xml) {
                fs.write(
                    join(basePath, 'webapp', 'localService', serviceName, `${annotation.technicalName}.xml`),
                    prettifyXml(annotation.xml, { indent: 4 })
                );
            }
        }
    } else if (edmxAnnotations?.xml) {
        fs.write(
            join(basePath, 'webapp', 'localService', serviceName, `${edmxAnnotations.technicalName}.xml`),
            prettifyXml(edmxAnnotations.xml, { indent: 4 })
        );
    }
}

/**
 * Updates cds files with the provided annotations.
 * This function takes cds annotations and an Editor instance,
 * then updates the relevant cds files with the given annotations.
 *
 * @param {CdsAnnotationsInfo} annotations - The cds annotations info.
 * @param {Editor} fs - The memfs editor instance
 * @returns {Promise<void>} A promise that resolves when the cds files have been updated.
 */
export async function updateCdsFilesWithAnnotations(
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
            // write into annotations.cds file
            if (fs.exists(annotationCdsPath)) {
                fs.append(annotationCdsPath, annotation.cdsFileContents);
            } else {
                fs.write(annotationCdsPath, annotation.cdsFileContents);
            }
            await updateCdsIndexOrServiceFile(fs, annotation);
        }
    } else {
        const annotationCdsPath = join(
            annotations.projectPath,
            annotations.appPath ?? '',
            annotations.projectName,
            'annotations.cds'
        );
        // write into annotations.cds file
        fs.write(annotationCdsPath, annotations.cdsFileContents);
        await updateCdsIndexOrServiceFile(fs, annotations);
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
 * Update the package.json with the required middlewares.
 *
 * @param path path to the package.json
 * @param fs - the memfs editor instance
 * @param addMockServer true if the mocksever middleware needs to be added as well
 */
export function updatePackageJson(path: string, fs: Editor, addMockServer: boolean): void {
    const packageJson = JSON.parse(fs.read(path));
    packageJson.devDependencies = packageJson.devDependencies ?? {};
    if (!hasUI5CliV3(packageJson.devDependencies)) {
        packageJson.ui5 = packageJson.ui5 ?? {};
        packageJson.ui5.dependencies = packageJson.ui5.dependencies ?? [];
        if (!packageJson.ui5.dependencies.includes('@sap/ux-ui5-tooling')) {
            packageJson.ui5.dependencies.push('@sap/ux-ui5-tooling');
        }
        if (
            addMockServer &&
            !packageJson.ui5.dependencies.includes('@sap/ux-ui5-fe-mockserver-middleware') &&
            !packageJson.ui5.dependencies.includes('@sap-ux/ui5-middleware-fe-mockserver')
        ) {
            packageJson.ui5.dependencies.push('@sap-ux/ui5-middleware-fe-mockserver');
        }
    }

    if (!packageJson.devDependencies['@sap/ux-ui5-tooling']) {
        packageJson.devDependencies['@sap/ux-ui5-tooling'] = '1';
    }

    if (addMockServer) {
        if (
            !packageJson.devDependencies['@sap/ux-ui5-fe-mockserver-middleware'] &&
            !packageJson.devDependencies['@sap-ux/ui5-middleware-fe-mockserver']
        ) {
            packageJson.devDependencies['@sap-ux/ui5-middleware-fe-mockserver'] = '2';
        }
    }
    fs.writeJSON(path, packageJson);
}
