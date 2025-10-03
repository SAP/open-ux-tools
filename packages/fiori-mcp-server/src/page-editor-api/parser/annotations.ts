import type { TooComplexData } from './model';

/**
 * Type guard to check whether a given value is of type `TooComplexData`.
 *
 * @param value The value to check.
 * @returns true if the value is a TooComplexData object.
 */
export function isTooComplex<T>(value: T | TooComplexData): value is TooComplexData {
    return (value as TooComplexData)?.tooComplex === true;
}
