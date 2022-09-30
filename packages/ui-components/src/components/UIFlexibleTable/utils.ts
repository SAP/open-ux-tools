/**
 * Get row actions button id.
 *
 * @param {string} tableId
 * @param {number | undefined} rowNumber
 * @param {string} actionName
 * @returns {string}
 */
export function getRowActionButtonId(tableId: string, rowNumber: number | undefined, actionName: string): string {
    return `table-${tableId || 'unknown'}-content-row-${rowNumber ?? 'unknown'}-actions-${actionName}`;
}

/**
 * Gets table actions button id.
 *
 * @param {string} tableId
 * @param {string} actionName
 * @returns {string}
 */
export function getTableActionButtonId(tableId: string, actionName: string): string {
    return `table-${tableId || 'unknown'}-actions-${actionName}`;
}

/**
 * Composes class name.
 *
 * @param {string} initialClass
 * @param {string | string[]} additionalClassNames
 * @returns {string}
 */
export function composeClassNames(
    initialClass: string,
    additionalClassNames?: (string | string[] | undefined)[]
): string {
    const classList: string[] = [initialClass];
    const addToArray = (array: string[], items: string | string[] | undefined | (string | string[] | undefined)[]) => {
        if (items) {
            if (Array.isArray(items)) {
                items.forEach((i) => addToArray(array, i));
            } else {
                array.push(items);
            }
        }
    };

    addToArray(classList, additionalClassNames);
    return classList.filter((item) => !!item).join(' ');
}
