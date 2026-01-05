import type { ODataServiceInfo } from '@sap-ux/axios-extension';

/**
 * Count the number of services from the result of a catalog call.
 *
 * @param catalogResult - V2 or V4 result of catalog call
 * @returns - number of services
 */
export function countNumberOfServices(catalogResult?: ODataServiceInfo[]): number {
    let numberServices = 0;
    if (Array.isArray(catalogResult)) {
        numberServices = catalogResult.length;
    }
    return numberServices;
}

/**
 * Format string to write number of services, e.g. 1 service or 123 services.
 *
 * @param count - number of service
 * @returns - string with number of services
 */
export function getServiceCountText(count: number) {
    return count === 1 ? `${count} service` : `${count} services`;
}

/**
 * Returns replacer function that can be used with JSON.stringify to detect
 * and replace circular structures.
 *
 * @example JSON.stringify(object, getCircularReplacer());
 * @returns - replacer that replaces circular structures
 */
export function getCircularReplacer(): (key: string, value: any) => any {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '|CIRCULAR STRUCTURE|';
            }
            seen.add(value);
        }
        return value;
    };
}

/**
 * Convert an int byte number to a nice output format like 1.23 KB.
 *
 * @param byteNumber - int number of bytes
 * @returns output string
 */
export function byteNumberToSizeString(byteNumber: number): string {
    if (byteNumber === 0) {
        return '0 Bytes';
    }
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(byteNumber) / Math.log(1024));
    return `${Number.parseFloat((byteNumber / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}
