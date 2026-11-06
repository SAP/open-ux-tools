/**
 * Validation helpers shared by the strict parsers of the packaged JSON resources (the value-bank store
 * and the semantic rule store). Each throws a TypeError naming what was expected, so a defective
 * resource stops the package from loading instead of being partly ignored.
 */

import { isRecord } from '../guards.js';

/**
 * A plain JSON object, or a TypeError naming what was expected.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the object
 */
export function objectRecord(value: unknown, label: string): Record<string, unknown> {
    if (!isRecord(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

/**
 * Reject keys outside the allowed set, so a misspelt or stray key is an error rather than ignored.
 *
 * @param input object to check
 * @param allowed the keys the shape may carry
 * @param label what the object is, for the error message
 */
export function assertKeys(input: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
    const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
    if (unexpected.length > 0) {
        throw new TypeError(`${label} has unexpected keys: ${unexpected.join(', ')}`);
    }
}

/**
 * A frozen, non-empty list of non-empty strings.
 *
 * @param value candidate list
 * @param label what the list is, for the error message
 * @returns the frozen list
 */
export function nonEmptyStrings(value: unknown, label: string): ReadonlyArray<string> {
    if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0)
    ) {
        throw new TypeError(`${label} must be a non-empty list of non-empty strings`);
    }
    return Object.freeze([...value]);
}

/**
 * A non-empty string.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the string
 */
export function nonEmptyString(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}
