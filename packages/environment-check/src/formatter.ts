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
    const stack: any[] = [];
    const keys: string[] = [];
    return function replacer(key, value) {
        if (stack.length > 0) {
            const thisPos = stack.indexOf(this);
            if (thisPos === -1) {
                stack.push(this);
                keys.push(key);
            } else {
                stack.splice(thisPos + 1);
                keys.splice(thisPos, Infinity, key);
            }
            if (stack.includes(value)) {
                value =
                    stack[0] === value
                        ? '|CIRCULAR STRUCTURE|'
                        : '|CIRCULAR STRUCTURE .' + keys.slice(0, stack.indexOf(value)).join('.') + '|';
            }
        } else {
            stack.push(value);
        }
        return value;
    };
}
