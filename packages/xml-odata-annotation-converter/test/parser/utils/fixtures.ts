import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Range, Position } from '@sap-ux/odata-annotation-core-types';

export const FIXTURE_ROOT = join(__dirname, '..', 'fixtures');

export function getAllFixtures(root: string): string[] {
    const children = readdirSync(root);
    return children.filter((child) => child.endsWith('.xml'));
}

/**
 * Parses position string.
 *
 * @param value position string in format (line,character)
 * @returns position object
 */
const expandPosition = (value: string): Position =>
    Position.create.apply(
        0,
        value
            .slice(1, -1)
            .split(',')
            .map((text) => Number.parseInt(text, 10)) as [number, number]
    );

/**
 * Parses range string.
 *
 * @param value [(line,character)..(line..character)]
 * @returns range object
 */
const expandRange = (value: string): Range =>
    Range.create.apply(0, value.slice(1, -1).split('..').map(expandPosition) as any);

const RANGE_PROPERTY_PATTERN = /[a-z]*ranges?/i;

export function deserialize<T>(text: string): T {
    return JSON.parse(text, (key, value) => {
        if (RANGE_PROPERTY_PATTERN.test(key) && typeof value === 'string') {
            return expandRange(value);
        } else if (RANGE_PROPERTY_PATTERN.test(key) && Array.isArray(value)) {
            return value.map((item) => expandRange(item));
        }
        return value;
    });
}
