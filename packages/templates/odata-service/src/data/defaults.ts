import { OdataService } from './types';

/**
 * @param data
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
