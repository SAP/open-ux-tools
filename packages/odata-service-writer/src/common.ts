import type { Editor } from 'mem-fs-editor';
import { dirname, join, sep } from 'path';
import { t } from './i18n';
import type { Manifest, ManifestNamespace, Package } from '@sap-ux/project-access';
import { DirName, FileName, getMinimumUI5Version, getWebappPath, hasUI5CliV3 } from '@sap-ux/project-access';
import type { EdmxAnnotationsInfo, EdmxOdataService, OdataService } from './types';
import prettifyXml from 'prettify-xml';
import semVer from 'semver';
import { getAnnotationNamespaces } from './data';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';

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
 * @param {EdmxAnnotationsInfo | EdmxAnnotationsInfo[]} serviceRemoteAnnotations - remote annotations of the OData service instance
 * @param {string | string[]} serviceLocalAnnotations - local annotations of the OData service instance
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
    const { annotations, annotationDataSources } = getDataSourceAnnotations(
        serviceName,
        serviceRemoteAnnotations,
        serviceLocalAnnotations
    );
    // Annotation dataSources used by service - remote and local annotations are handled differently
    let previousAnnotationNames: string[] = [];
    if (dataSources[serviceName]?.settings?.annotations && forceServiceUpdate) {
        previousAnnotationNames = dataSources[serviceName].settings?.annotations;
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
    // Clean old annotations in case of an update
    previousAnnotationNames.forEach((name) => {
        if (dataSources[name] && !annotations.includes(name)) {
            const oldAnnotationPath = dataSources[name].settings?.localUri;
            // Delete old annotation files
            if (oldAnnotationPath && fs.exists(join(webappPath, oldAnnotationPath))) {
                fs.delete(join(webappPath, oldAnnotationPath));
            }
            delete dataSources[name];
        }
    });
    // Update manifest.json dataSources
    manifest['sap.app'].dataSources = dataSources;
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
    // Throw if required property is not found manifest.json
    if (!appid) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', { property: `'${appProp}'.id`, path: manifestPath })
        );
    }
    // Throw if only update is required and service is not found in manifest.json
    if (forceServiceUpdate && service.name && !manifest[appProp]?.dataSources?.[service.name]) {
        throw new Error(
            t('error.requiredProjectPropertyNotFound', {
                property: `'${appProp}.dataSources.${service.name}'`,
                path: manifestPath
            })
        );
    }
    // Check and update existing services in a way that is supported by multiple services
    const convertedManifest = await convertExistingServices(webappPath, manifest, fs);
    // Update manifest.json services
    enhanceManifest(service, convertedManifest, webappPath, fs, forceServiceUpdate);
    fs.writeJSON(manifestPath, convertedManifest);
}

/**
 * Update the package.json with the required middlewares.
 *
 * @param path path to the package.json
 * @param fs - the memfs editor instance
 * @param addMockServer true if the mocksever middleware needs to be added as well
 */
export function updatePackageJson(path: string, fs: Editor, addMockServer: boolean): void {
    const packageJson = JSON.parse(fs.read(path)) as Package;
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

/**
 * Determines model settings based on the UI5 version.
 *
 * @param minUI5Version - The minimum UI5 version.
 * @returns updated model settings.
 */
export function getModelSettings(minUI5Version: string | undefined): { includeSynchronizationMode: boolean } {
    let includeSynchronizationMode = false;
    if (minUI5Version) {
        includeSynchronizationMode = semVer.satisfies(minUI5Version, '<=1.110');
    }
    return { includeSynchronizationMode };
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
export function enhanceManifestModels(
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
 * Populates annotations as manifest dataSources.
 *
 * @param {string} serviceName - name of the OData service instance
 * @param {EdmxAnnotationsInfo | EdmxAnnotationsInfo[]} serviceRemoteAnnotations - remote annotations of the OData service instance
 * @param {string | string[]} serviceLocalAnnotations - local annotations of the OData service instance
 * @returns annotations list and annotation dataSources.
 */
export function getDataSourceAnnotations(
    serviceName: string,
    serviceRemoteAnnotations?: EdmxAnnotationsInfo | EdmxAnnotationsInfo[],
    serviceLocalAnnotations?: string | string[]
): {
    annotations: string[];
    annotationDataSources: { [k: string]: ManifestNamespace.DataSource };
} {
    const annotations: string[] = [];
    // Service annotation names to be stored in service settings of dataSource
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
    return {
        annotations,
        annotationDataSources
    };
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
 * Writes local copies of metadata.xml and local annotations.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {string} templateRoot - path to the file templates
 * @param {OdataService} service - the OData service instance with EDMX type
 */
export async function writeLocalServiceFiles(
    fs: Editor,
    basePath: string,
    webappPath: string,
    templateRoot: string,
    service: EdmxOdataService
): Promise<void> {
    // mainService should be used in case there is no name defined for service
    fs.write(
        join(webappPath, 'localService', service.name ?? 'mainService', 'metadata.xml'),
        prettifyXml(service.metadata, { indent: 4 })
    );
    // Adds local annotations to datasources section of manifest.json and writes the annotations file
    if (service.localAnnotationsName) {
        const namespaces = getAnnotationNamespaces(service);
        fs.copyTpl(
            join(templateRoot, 'add', 'annotation.xml'),
            join(basePath, 'webapp', 'annotations', `${service.localAnnotationsName}.xml`),
            { ...service, namespaces }
        );
    }
}

/**
 * Removes local copies of metadata.xml and local annotations.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {string} webappPath - the webapp path of an existing UI5 application
 * @param {string} templateRoot - path to the file templates
 * @param {OdataService} service - the OData service instance with EDMX type
 */
export async function removeLocalServiceFiles(
    fs: Editor,
    basePath: string,
    webappPath: string,
    service: EdmxOdataService
): Promise<void> {
    const localMetadaPath = join(webappPath, 'localService', service.name ?? 'mainService', 'metadata.xml');
    if (fs.exists(localMetadaPath)) {
        fs.delete(localMetadaPath);
    }
    if (service.localAnnotationsName) {
        const localAnnotationsPath = join(basePath, 'webapp', 'annotations', `${service.localAnnotationsName}.xml`);
        if (fs.exists(localAnnotationsPath)) {
            fs.delete(localAnnotationsPath);
        }
    }
}

/**
 * Generates mockserver middleware config for ui5-local.yaml file based on ui5-mock.yaml.
 *
 * @param {Editor} fs - the memfs editor instance
 * @param {OdataService} ui5YamlPath - path pointing to the ui5.yaml file
 * @param {UI5Config} ui5LocalConfigPath - ui5-local.yaml configuration
 * @param {string} ui5LocalConfig - path pointing to the ui5-local.yaml file
 * @returns {Promise<Editor>} the updated memfs editor instance
 */
export async function generateMockserverMiddlewareBasedOnUi5MockYaml(
    fs: Editor,
    ui5YamlPath: string,
    ui5LocalConfigPath?: string,
    ui5LocalConfig?: UI5Config
): Promise<void> {
    // Update ui5-local.yaml with mockserver middleware from ui5-mock.yaml
    const ui5MockYamlPath = join(dirname(ui5YamlPath), FileName.Ui5MockYaml);
    const ui5MockYamlConfig = await UI5Config.newInstance(fs.read(ui5MockYamlPath));
    const mockserverMiddlewareFromUi5Mock = ui5MockYamlConfig.findCustomMiddleware(
        'sap-fe-mockserver'
    ) as CustomMiddleware;
    if (ui5LocalConfigPath && fs.exists(ui5LocalConfigPath) && ui5LocalConfig && mockserverMiddlewareFromUi5Mock) {
        ui5LocalConfig.updateCustomMiddleware(mockserverMiddlewareFromUi5Mock);
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
function convertExistingService(
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
export async function convertExistingServices(webappPath: string, manifest: Manifest, fs: Editor): Promise<Manifest> {
    const dataSources = manifest?.['sap.app']?.dataSources;
    for (const dataSourceKey in dataSources) {
        const dataSource = dataSources[dataSourceKey];
        if (dataSource.type === 'OData') {
            convertExistingService(webappPath, dataSourceKey, dataSource, fs);
            const annotations = dataSource.settings?.annotations;
            if (annotations) {
                annotations.forEach((annotationName) => {
                    const annotationDataSource = dataSources[annotationName];
                    convertExistingService(webappPath, dataSourceKey, annotationDataSource, fs);
                });
            }
        }
    }
    return manifest;
}
