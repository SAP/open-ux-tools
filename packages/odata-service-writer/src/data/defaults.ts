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
 * Sets the default datasource name for the given annotations.
 * If the annotations name is not defined or empty, it creates a default annotations name
 * from the technicalName by replacing all '/' characters with '_' and removing the leading '_'.
 *
 * @param annotations - the array of Edmx annotation referenced to be enhances.
 */
function setDefaultAnnotationsName(annotations: EdmxAnnotationsInfo[]): void {
    for (const annotation of annotations) {
        if (annotation.technicalName && !annotation.name) {
            annotation.name = annotation.technicalName?.replace(/\//g, '_')?.replace(/^_/, '');
        }
    }
}

/**
 * Typecheck of annotations.
 *
 * @param annotations - the annotations object to be checked
 * @returns true if the annotations object is of type EdmxAnnotationsInfo
 */
function isEdmxAnnotationsInfo(annotations: EdmxAnnotationsInfo | unknown): annotations is EdmxAnnotationsInfo {
    return (annotations as EdmxAnnotationsInfo)?.technicalName !== undefined;
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
        if (isEdmxAnnotationsInfo(service.annotations)) {
            service.annotations = [service.annotations];
        }
        service.annotations ??= [];
        setDefaultAnnotationsName(service.annotations as EdmxAnnotationsInfo[]);
    }

    // enhance preview settings with service configuration
    service.previewSettings ??= {};
    service.previewSettings.path ??= `/${service.path?.split('/').filter((s: string) => s !== '')[0] ?? ''}`;
    service.previewSettings.url ??= service.url ?? 'http://localhost';
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
