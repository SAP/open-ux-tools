import { join } from 'path';
import type { OdataService, EdmxAnnotationsInfo } from '../types';
import { ServiceType } from '../types';
import { DEFAULT_DATASOURCE_NAME } from './constants';
import type { Manifest } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';

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
 * Sets the default name for a given service.
 * If the service name is not defined, it sets the name to `DEFAULT_DATASOURCE_NAME`.
 *
 * @param {OdataService} service - The service object whose name needs to be set or modified.
 */
function setDefaultServiceName(service: OdataService): void {
    service.name = service.name ?? DEFAULT_DATASOURCE_NAME;
}

/**
 * Sets the default model for a given service.
 * Default UI5 model is used for first service model.
 * For next services service model or service name is used as model (if model is not defined).
 *
 * @param {string} basePath - the root path of an existing UI5 application
 * @param {OdataService} service - The service object whose model needs to be set or modified
 * @param fs - the memfs editor instance
 */
function setDefaultServiceModel(basePath: string, service: OdataService, fs: Editor): void {
    const manifestPath = join(basePath, 'webapp', 'manifest.json');
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    // Check if manifest has already any dataSource models defined, empty string '' should be used for the first service
    const models = manifest?.['sap.ui5']?.models;
    if (models) {
        // Filter dataSource models by dataSource property
        const servicesModels = Object.values(models).filter((model) => model.dataSource);
        // First one is being added, set model to ''
        if (servicesModels.length === 0) {
            service.model = '';
        } else {
            // Else use actual model or service name as service model to avoid another '' being added
            service.model = service.model ?? service.name;
        }
    } else {
        // No models defined, that means first one is being added, set model to ''
        service.model = '';
    }
}

/**
 * Sets the default annotations name for a given service.
 * Handles single annotation info or annotations array.
 * If the service annotations name is not defined or empty, it creates a default annotations name
 * from the technicalName by replacing all '/' characters with '_' and removing the leading '_'.
 *
 * @param {OdataService} service - The service object whose annotations name needs to be set or modified.
 */
function setDefaultAnnotationsName(service: OdataService): void {
    if (Array.isArray(service.annotations)) {
        const annotations = service.annotations as EdmxAnnotationsInfo[];
        for (const annotationName in annotations) {
            const annotation = annotations[annotationName];
            if (annotation?.technicalName && !annotation.name) {
                annotation.name = annotation?.technicalName?.replace(/\//g, '_')?.replace(/^_/, '');
            }
        }
    } else {
        const annotation = service.annotations as EdmxAnnotationsInfo;
        if (annotation?.technicalName && !annotation.name) {
            annotation.name = annotation?.technicalName?.replace(/\//g, '_')?.replace(/^_/, '');
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
 */
export function enhanceData(basePath: string, service: OdataService, fs: Editor): void {
    setDefaultServicePath(service);
    setDefaultServiceName(service);
    setDefaultServiceModel(basePath, service, fs);
    // set service type to EDMX if not defined
    service.type = service.type ?? ServiceType.EDMX;
    /**
     * In the manifest EJS template, annotation names are used to add annotations to the manifest.json.
     * For CAP projects, annotations are added to the annotations.cds file instead of the manifest.json.
     * If the service type is EDMX, this function sets the default annotation names to be included in the manifest.json.
     */
    if (service.type === ServiceType.EDMX) {
        setDefaultAnnotationsName(service);
    }

    // enhance preview settings with service configuration
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
}
