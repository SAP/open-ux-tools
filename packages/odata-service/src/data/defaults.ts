import { OdataService } from '@sap/open-ux-tools-types';

/**
 * Enhances the provided OData service object with path, name and model information.
 *
 * @param {OdataService} data - the OData service object
 */
export function enhanceData(data: OdataService): void {
    if (data.path.substring(data.path.length - 1) !== '/') {
        data.path = data.path + '/';
    }
    if (data.name === undefined) {
        data.name = 'mainService';
        data.model = '';
    } else if (data.model === undefined) {
        data.model = data.name;
    }
}
