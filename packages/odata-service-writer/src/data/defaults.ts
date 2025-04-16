import { join } from 'path';
import type { OdataService, EdmxAnnotationsInfo, DataSources } from '../types';
import { ServiceType } from '../types';
import { DEFAULT_DATASOURCE_NAME } from './constants';
import type { Manifest } from '@sap-ux/project-access';
import { FileName, getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Sets the default path for a given service.
 * If the service path is not defined, it sets the path to '/'.
 * If the service path does not end with '/', it appends '/' to the end.
 *
 * @param {OdataService} service - The service object whose path needs to be set or modified.
 */
function setDefaultServicePath(service: OdataService): void {
    service.path = service.path?.endsWith('/') ? service.path : (service.path ?? '') + '/';
}

/**
 * Generates a unique name for the service.
 *
 * @param {OdataService} dataSources - The service object whose path needs to be set or modified.
 * @param {string} serviceName - The service object whose path needs to be set or modified.
 * @returns Unique service name.
 */
function generateUniqueServiceName(dataSources: DataSources, serviceName: string): string {
    let tmpSrvName = serviceName;
    let uniqueNameCount = 1;
    let doesExist = true; // Ensure data source name is unique
    do {
        if (dataSources?.[tmpSrvName]) {
            tmpSrvName = `${serviceName}${uniqueNameCount++}`; // Try with a new name
        } else {
            doesExist = false;
        }
    } while (doesExist);
    return tmpSrvName;
}

/**
 * Sets the default name for a given service.
 * Default serivce name is used only for first service.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - The service object whose name needs to be set or modified.
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} update - whether the update is running
 */
async function setDefaultServiceName(
    basePath: string,
    service: OdataService,
    fs: Editor,
    update: boolean
): Promise<void> {
    const manifestPath = join(await getWebappPath(basePath, fs), FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    // Check if manifest has already any dataSources defined, DEFAULT_DATASOURCE_NAME should be used for the first service
    const dataSources = manifest?.['sap.app']?.dataSources;
    if (dataSources) {
        // Filter out ODataAnnotation dataSources and keep only OData ones
        const oDataSources = Object.values(dataSources).filter((dataSource) => dataSource.type === 'OData');
        if (oDataSources.length === 0) {
            service.name = DEFAULT_DATASOURCE_NAME;
        } else if (service.name && !update) {
            service.name = generateUniqueServiceName(dataSources, service.name);
        }
    } else {
        // No existing dataSources - no existing services, use default name
        service.name = DEFAULT_DATASOURCE_NAME;
    }
}

/**
 * Sets the default model for a given service.
 * Default UI5 model is used for first service model.
 * For next services service model or service name is used as model (if model is not defined).
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - The service object whose model needs to be set or modified
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} update - whether the update is running
 */
async function setDefaultServiceModel(
    basePath: string,
    service: OdataService,
    fs: Editor,
    update: boolean
): Promise<void> {
    const manifestPath = join(await getWebappPath(basePath, fs), 'manifest.json');
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    if (!service.model) {
        // Check if manifest has already any dataSource models defined, empty string '' should be used for the first service
        const models = manifest?.['sap.ui5']?.models;
        if (models) {
            // Filter dataSource models by dataSource property
            const servicesModels = Object.values(models).filter((model) => model.dataSource);
            if (
                servicesModels.length === 0 ||
                (update &&
                    servicesModels.find((serviceModel) => serviceModel.dataSource === DEFAULT_DATASOURCE_NAME) &&
                    service.name === DEFAULT_DATASOURCE_NAME)
            ) {
                service.model = '';
            } else if (service.name) {
                service.model = service.name;
            }
        } else {
            // No models defined, that means first one is being added, set model to ''
            service.model = '';
        }
    }
}

/**
 * Sets default annotation name for a single annotation of a given service.
 * If the service annotation name is not defined or empty, it creates a default annotations name
 * from the technicalName by replacing all '/' characters with '_' and removing the leading '_'.
 * If the service and annotation names are the same, then '_Annotation' string is added at the end of annotation name.
 *
 * @param {EdmxAnnotationsInfo} annotation - annotation of a given service
 * @param {string} serviceName - name of the service whose annotations are getting modified.
 */
function setDefaultAnnotationName(annotation: EdmxAnnotationsInfo, serviceName?: string): void {
    if (annotation?.technicalName && !annotation.name) {
        annotation.name = annotation?.technicalName?.replace(/\//g, '_')?.replace(/^_/, '');
    }
    if (annotation.name === serviceName) {
        annotation.name += '_Annotation';
    }
}

/**
 * Sets default names for annotations of a given service.
 * Handles single annotation in object or annotations array.
 *
 * @param {OdataService} service - The service object whose annotations name needs to be set or modified.
 */
function setDefaultAnnotationsName(service: OdataService): void {
    if (Array.isArray(service.annotations)) {
        const annotations = service.annotations as EdmxAnnotationsInfo[];
        for (const annotationName in annotations) {
            const annotation = annotations[annotationName];
            setDefaultAnnotationName(annotation, service.name);
        }
    } else if (service.annotations) {
        const annotation = service.annotations as EdmxAnnotationsInfo;
        setDefaultAnnotationName(annotation, service.name);
    }
}

/**
 * Sets default preview settings of a given service.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - The service object whose preview settings needs to be set or modified.
 * @param {Editor} fs - the memfs editor instance
 */
async function setDefaultPreviewSettings(basePath: string, service: OdataService, fs: Editor): Promise<void> {
    service.previewSettings = service.previewSettings ?? {};
    service.previewSettings.path =
        service.previewSettings.path ?? `/${service.path?.split('/').filter((s: string) => s !== '')[0] ?? ''}`;
    service.previewSettings.url = service.previewSettings.url ?? service.url ?? 'http://localhost';
    if (service.client && !service.previewSettings.client) {
        service.previewSettings.client = service.client;
    }
    if (service.destination && !service.previewSettings.destination) {
        service.previewSettings.destination = service.destination.name;
        if (service.destination.instance) {
            service.previewSettings.destinationInstance = service.destination.instance;
        }
    }
    const ui5Yamlpath = join(basePath, FileName.Ui5Yaml);
    if (fs.exists(ui5Yamlpath)) {
        const yamlContents = fs.read(ui5Yamlpath);
        const ui5Config = await UI5Config.newInstance(yamlContents);
        const backends = ui5Config.getBackendConfigsFromFioriToolsProxydMiddleware();
        // There should be only one /sap entry
        if (backends.find((existingBackend) => existingBackend.path === '/sap')) {
            service.previewSettings.path = service.path;
        }
    }
}

/**
 * Enhances the provided OData service object with path, name and model information.
 * Directly modifies the passed object reference.
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - the OData service instance
 * @param {Editor} fs - the memfs editor instance
 * @param {boolean} update - whether the update is running
 */
export async function enhanceData(basePath: string, service: OdataService, fs: Editor, update = false): Promise<void> {
    setDefaultServicePath(service);
    await setDefaultServiceName(basePath, service, fs, update);
    await setDefaultServiceModel(basePath, service, fs, update);
    // set service type to EDMX if not defined
    service.type = service.type ?? ServiceType.EDMX;
    /**
     * In the manifest annotation names are used to add annotations to the manifest.json.
     * For CAP projects, annotations are added to the annotations.cds file instead of the manifest.json.
     * If the service type is EDMX, this function sets the default annotation names to be included in the manifest.json.
     */
    if (service.type === ServiceType.EDMX) {
        setDefaultAnnotationsName(service);
    }

    // enhance preview settings with service configuration
    await setDefaultPreviewSettings(basePath, service, fs);
}
