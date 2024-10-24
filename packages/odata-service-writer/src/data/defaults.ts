import type { OdataService, EdmxAnnotationsInfo } from '../types';
import { ServiceType } from '../types';
import { DEFAULT_DATASOURCE_NAME } from './constants';

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
 * If the service model is not defined, it sets the model to an empty string (Default UI5 model).
 *
 * @param {OdataService} service - The service object whose model needs to be set or modified.
 */
function setDefaultServiceModel(service: OdataService): void {
    service.model = service.model ?? ''; // Default UI5 model
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
    if (service.annotations && Array.isArray(service.annotations)) {
        const annotations = service.annotations as EdmxAnnotationsInfo[];
        for (const i in annotations) {
            const annotation = annotations[i];
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
 * @param {OdataService} service - the OData service object
 */
export function enhanceData(service: OdataService): void {
    setDefaultServicePath(service);
    setDefaultServiceName(service);
    setDefaultServiceModel(service);
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
    service.previewSettings = service.previewSettings || {};
    service.previewSettings.path =
        service.previewSettings.path || `/${service.path?.split('/').filter((s: string) => s !== '')[0] ?? ''}`;
    service.previewSettings.url = service.previewSettings.url || service.url || 'http://localhost';
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
