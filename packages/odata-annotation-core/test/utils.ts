import { Range, Position } from '@sap-ux/odata-annotation-core-types';

/**
 * Cretaes range by given coordinates.
 *
 * @param line1
 * @param character1
 * @param line2
 * @param character2
 * @returns range object
 */
export function createRange(line1: number, character1: number, line2: number, character2: number): Range {
    return Range.create(Position.create(line1, character1), Position.create(line2, character2));
}
