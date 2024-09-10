import { Range, Position } from '@sap-ux/text-document-utils';

/**
 *
 * @param value (line,character)
 * @returns The Position object representing the expanded position.
 */
const expandPosition = (value: string): Position =>
    Position.create.apply(
        0,
        value
            .substr(1, value.length - 2)
            .split(',')
            .map((text) => parseInt(text, 10)) as any
    );
/**
 *
 * @param value [(line,character)..(line..character)]
 * @returns The Range object representing the expanded Range.
 */
const expandRange = (value: string): Range =>
    Range.create.apply(
        0,
        value
            .substr(1, value.length - 2)
            .split('..')
            .map(expandPosition) as any
    );

const rangePropertyPattern = /[a-z]*ranges?/i;

export const deserialize = <T>(text: string): T => {
    return JSON.parse(text, (key, value) => {
        if (rangePropertyPattern.test(key) && typeof value === 'string') {
            return expandRange(value);
        } else if (rangePropertyPattern.test(key) && Array.isArray(value)) {
            return value.map((item) => expandRange(item));
        }
        return value;
    });
};
