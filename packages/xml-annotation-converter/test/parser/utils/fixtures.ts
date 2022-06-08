import { readdir } from 'fs/promises';
import { join } from 'path';

import { Range, Position } from '@sap-ux/odata-annotation-core';

export const FIXTURE_ROOT = join(__dirname, 'fixtures');

export async function getAllFixtures(root: string): Promise<string[]> {
    const children = await readdir(root);
    return children.filter((child) => child.endsWith('.xml'));
}

/**
 *
 * @param value (line,character)
 */
const expandPosition = (value: string): Position =>
    Position.create.apply(
        0,
        value
            .substring(1, -1)
            .split(',')
            .map((text) => parseInt(text, 10))
    );
/**
 *
 * @param value [(line,character)..(line..character)]
 */
const expandRange = (value: string): Range =>
    Range.create.apply(0, value.substring(1, -1).split('..').map(expandPosition));

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
