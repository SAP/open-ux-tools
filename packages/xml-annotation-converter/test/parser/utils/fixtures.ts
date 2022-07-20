import { readdirSync } from 'fs';
import { join } from 'path';

import { Range, Position } from '@sap-ux/odata-annotation-core-types';

export const FIXTURE_ROOT = join(__dirname, '..', 'fixtures');

export function getAllFixtures(root: string): string[] {
    const children = readdirSync(root);
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
            .slice(1, -1)
            .split(',')
            .map((text) => parseInt(text, 10)) as [line: number, character: number]
    );
/**
 *
 * @param value [(line,character)..(line..character)]
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
