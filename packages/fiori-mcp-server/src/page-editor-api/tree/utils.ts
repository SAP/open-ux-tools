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
