/**
 * Method checks if arrays are same - check is performed without deep equality.
 *
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @returns Is arrays are same.
 */
export const isArrayEqual = (
    arr1: Array<unknown> | null | undefined,
    arr2: Array<unknown> | null | undefined
): boolean => {
    if (!arr1 || !arr2) {
        return arr1 === arr2;
    }
    return (
        arr1.length === arr2.length &&
        arr1.every(function (value, index) {
            return value === arr2[index];
        })
    );
};

/**
 * Method checks if array 'arr1' ends with all entries from 'arr2'.
 *
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @returns Is 'arr1' ends with entries from 'arr2'.
 */
export const isArrayEndsWith = <T>(arr1: Array<T> | null, arr2: Array<T> | null): boolean => {
    if (!arr1 || !arr2 || arr2.length > arr1.length) {
        return false;
    }
    let index1 = arr1.length - 1;
    let index2 = arr2.length - 1;
    while (index2 >= 0) {
        if (arr2[index2] !== arr1[index1]) {
            return false;
        }
        index1--;
        index2--;
    }
    return true;
};

/**
 * Method to get value for passed path in passed object.
 *
 * @param obj - Object to use.
 * @param paths - Path for searching property/value.
 * @returns Found value for passed path.
 */
export const getProperty = (obj: object, paths: Array<string | number>): unknown => {
    let current = obj;
    for (const path of paths) {
        if (path === undefined) {
            continue;
        }
        if (typeof current === 'object' && path in current) {
            // found and continue
            current = (current as { [key: string]: object })[path];
        } else {
            return undefined;
        }
    }
    return current;
};
