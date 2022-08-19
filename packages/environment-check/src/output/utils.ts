/**
 * Recursive function to extract nested objects.
 *
 * @param object object to be flattened
 * @returns flattened object
 */
export const flattenObject = (object) => {
    const flattened = {};
    Object.keys(object).forEach((key) => {
        const value = object[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(flattened, flattenObject(value));
        } else {
            flattened[key] = value;
        }
    });
    return flattened;
};
