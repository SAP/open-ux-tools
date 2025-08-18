import type { TooComplexData } from './model';

export function isTooComplex<T>(value: T | TooComplexData): value is TooComplexData {
    return (value as TooComplexData)?.tooComplex === true;
}
