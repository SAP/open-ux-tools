import { OdataService } from '@sap-ux/open-ux-tools-types';
import { DEFAULT_DATASOURCE_NAME } from './constants';

/**
 * Enhances the provided OData service object with path, name and model information.
 * Directly modifies the passed object reference.
 *
 * @param {OdataService} data - the OData service object
 */
export function enhanceData(data: OdataService): void {
    if (data.path.substring(data.path.length - 1) !== '/') {
        data.path = data.path + '/';
    }
    if (data.name === undefined) {
        data.name = DEFAULT_DATASOURCE_NAME;
    }
    if (data.model === undefined) {
        data.model = ''; // Default UI5 model
    }
}
