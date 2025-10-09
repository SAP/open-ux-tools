import { Range, Position } from '@sap-ux/odata-annotation-core';

/**
 * Parses short hand position expression and creates an object from it.
 *
 * @param value (line,character)
 * @returns position object
 */
function expandPosition(value: string): Position {
    const [line, character] = value
        .substring(1, value.length - 1)
        .split(',')
        .map((text) => Number.parseInt(text, 10));
    return Position.create(line, character);
}
/**
 * Parses short hand range expression and creates an object from it.
 *
 * @param value [(line,character)..(line..character)]
 * @returns range object
 */
function expandRange(value: string): Range {
    const [start, end] = value
        .substring(1, value.length - 1)
        .split('..')
        .map(expandPosition);
    return Range.create(start, end);
}

const rangePropertyPattern = /[a-z]*ranges?/i;

/**
 * Parses JSON text which has short hand notation for ranges.
 *
 * @param text
 * @returns deserialized value
 */
export const deserialize = <T>(text: string): T => {
    return JSON.parse(text, (key, value) => {
        if (value === 'NEGATIVE_ZERO') {
            return -0;
        }
        if (rangePropertyPattern.test(key) && typeof value === 'string') {
            return expandRange(value);
        } else if (rangePropertyPattern.test(key) && Array.isArray(value)) {
            return value.map((item) => expandRange(item));
        }
        return value;
    });
};
