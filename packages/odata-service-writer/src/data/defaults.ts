import type { OdataService } from '../types';
import { DEFAULT_DATASOURCE_NAME } from './constants';

/**
 * Enhances the provided OData service object with path, name and model information.
 * Directly modifies the passed object reference.
 *
 * @param {OdataService} service - the OData service object
 */
export function enhanceData(service: OdataService): void {
    // Set default path
    if (service.path === undefined) {
        service.path = '/';
    } else if (service.path.substring(service.path.length - 1) !== '/') {
        service.path = service.path + '/';
    }

    if (service.name === undefined) {
        service.name = DEFAULT_DATASOURCE_NAME;
    }
    if (service.model === undefined) {
        service.model = ''; // Default UI5 model
    }

    // enhance preview settings with service configuration
    service.previewSettings = service.previewSettings || {};
    service.previewSettings.path =
        service.previewSettings.path || `/${service.path?.split('/').filter((s: string) => s !== '')[0] || ''}`;
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
