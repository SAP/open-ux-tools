/**
 * The value the standard SAP Fiori elements mock server writes into a string property it has no data for
 * (`@sap-ux/fe-mockserver-core`, `FileBasedMockData.getRandomValueFromType`, case `Edm.String`): the property
 * name, an underscore and the zero-based row index, the name cut so the value fits the declared maximum length.
 *
 * @see https://github.com/SAP/open-ux-odata/tree/main/packages/fe-mockserver-core
 */
import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { JsonValue } from '../types.js';

/**
 * The standard mock server's value for a string property at a row; none for a column too short for part of the
 * name plus the index, since the index alone would read as a code or flag.
 *
 * @param property the string property
 * @param index zero-based row index
 * @returns the value, or undefined when no part of the name fits
 */
export function standardFallbackValue(property: SchemaProperty, index: number): string | undefined {
    const number = String(index);
    if (property.maxLength === undefined) {
        return `${property.name}_${number}`;
    }
    const nameLength = property.maxLength - number.length - 1;
    return nameLength > 0 ? `${property.name.substring(0, nameLength)}_${number}` : undefined;
}

/**
 * Whether a value is one {@link standardFallbackValue} writes for the property: a leading part of its name, in
 * its case or upper case, an underscore and a number.
 *
 * @param property the string property
 * @param value the value
 * @returns true for a standard fallback value
 */
export function isStandardFallbackValue(property: SchemaProperty, value: JsonValue | undefined): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const match = /^(.+)_\d+$/u.exec(value);
    // An upper-case field holds the value in upper case.
    return match !== null && property.name.toUpperCase().startsWith(match[1].toUpperCase());
}

/** The fallback test of each service schema, built once per schema. */
const serviceTests = new WeakMap<SchemaGraph, (value: JsonValue | undefined) => boolean>();

/**
 * A test for the standard fallback values anywhere in a service: a leading part of any property name, an underscore and
 * a number. A value-list field holds another field's fallback value, which {@link isStandardFallbackValue} misses.
 *
 * @param graph service schema
 * @returns the test
 */
export function standardFallbackTest(graph: SchemaGraph): (value: JsonValue | undefined) => boolean {
    let test = serviceTests.get(graph);
    if (test === undefined) {
        // Compared in upper case: an upper-case field holds the value in upper case.
        const prefixes = new Set<string>();
        for (const { name } of graph.entities.flatMap(({ properties }) => properties)) {
            for (let length = 1; length <= name.length; length++) {
                prefixes.add(name.slice(0, length).toUpperCase());
            }
        }
        test = (value): boolean => {
            const match = typeof value === 'string' ? /^(.+)_\d+$/u.exec(value) : null;
            return match !== null && prefixes.has(match[1].toUpperCase());
        };
        serviceTests.set(graph, test);
    }
    return test;
}
