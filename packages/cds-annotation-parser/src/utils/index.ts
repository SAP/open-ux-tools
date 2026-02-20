export const hasNaNOrUndefined = (value: undefined | number): boolean => {
    if (value === undefined) {
        return true;
    }
    return Number.isNaN(value);
};
export const isDefined = <T>(value: T | undefined): value is T => {
    return value !== undefined;
};
export const hasItems = <T>(array: Array<T> | undefined, minItemCount = 1): array is T[] =>
    Array.isArray(array) && array.length >= minItemCount;
