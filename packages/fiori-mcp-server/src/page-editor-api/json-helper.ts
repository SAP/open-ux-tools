import type { PropertyPath } from './parser';

/**
 * Static method updates object for passed path.
 *
 * @param obj Object to update.
 * @param paths Path for update.
 * @param value New value to update with.
 * @param arrayElement Value should be inserted into array.
 */
export function updateProperty(obj: object, paths: PropertyPath, value: unknown, arrayElement = false): void {
    traverseProperty(obj, paths, value !== undefined, (context: any, key: string | number) => {
        // Update received element
        if (value !== undefined) {
            if (arrayElement && Array.isArray(context[key])) {
                context[key].push(value);
            } else {
                context[key] = arrayElement ? [value] : value;
            }
        } else {
            if (Array.isArray(context)) {
                context.splice(typeof key === 'string' ? parseInt(key, 10) : key, 1);
            } else {
                delete context[key];
            }
        }
    });
}

/**
 * Method traverse object by given path and call callback when given path is resolved/found.
 *
 * @param obj Object to update.
 * @param paths Path for update.
 * @param prepare If any sub property is not found, then prepare object.
 * @param callback Callback listener.
 */
function traverseProperty(
    obj: any,
    paths: PropertyPath,
    prepare: boolean,
    callback: (context: any, key: string | number) => void
): void {
    let current = obj;
    for (let i = 0; i < paths.length; i++) {
        if (paths[i] === undefined) {
            continue;
        }
        if (i === paths.length - 1) {
            // We found edge - call callback
            callback(current, paths[i]);
        }
        if (current[paths[i]] === undefined && prepare) {
            // Check if next path is integer, then consider, that array should be created
            const isArray = paths[i + 1] !== undefined && typeof paths[i + 1] === 'number';
            current[paths[i]] = !isArray ? {} : [];
        }
        current = current[paths[i]];
        if (!current) {
            break;
        }
    }
}
