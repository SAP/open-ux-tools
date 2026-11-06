import type { SchemaProperty } from '../schema/graph.js';
import { SAP_V2_DISPLAY_FORMAT, SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from './odata.js';

/**
 * The value facets of a string field beyond its type and length, from the SAP vocabularies: digits only
 * (`Common.IsDigitSequence`, V2 `sap:display-format="NonNegative"`) and upper case (`Common.IsUpperCase`,
 * V2 `sap:display-format="UpperCase"`).
 *
 * @see https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md
 * @see https://github.com/SAP/odata-vocabularies/blob/main/docs/v2-annotations.md
 */
export interface StringFacets {
    /** The field holds a sequence of digits. */
    digits: boolean;
    /** The field holds upper-case text. */
    upperCase: boolean;
}

/**
 * The value facets a string field declares.
 *
 * @param property the field
 * @returns its facets; none for a field that is no string
 */
export function stringFacets(property: SchemaProperty): StringFacets {
    const facets = { digits: false, upperCase: false };
    if (property.primitiveType !== 'string') {
        return facets;
    }
    for (const { term, value } of property.annotations) {
        const normalized = term.toLowerCase();
        const format = typeof value === 'string' ? value.toLowerCase() : undefined;
        const enabled = value !== false && value !== 'false';
        if (
            (normalized.endsWith(VOCABULARY_TERM_SUFFIX.isDigitSequence) && enabled) ||
            (normalized === SAP_V2_TERM.displayFormat && format === SAP_V2_DISPLAY_FORMAT.nonNegative)
        ) {
            facets.digits = true;
        }
        if (
            (normalized.endsWith(VOCABULARY_TERM_SUFFIX.isUpperCase) && enabled) ||
            (normalized === SAP_V2_TERM.displayFormat && format === SAP_V2_DISPLAY_FORMAT.upperCase)
        ) {
            facets.upperCase = true;
        }
    }
    return facets;
}

/**
 * The form a string takes in a field with facets: upper case in an upper-case field. A string with other
 * characters than digits has no form in a digit field, nor has a string that upper case makes too long.
 *
 * @param property the field
 * @param value the string
 * @returns the string in the field's form, or undefined when it has none
 */
export function inFacetForm(property: SchemaProperty, value: string): string | undefined {
    const { digits, upperCase } = stringFacets(property);
    if (digits && !/^\d*$/u.test(value)) {
        return undefined;
    }
    const form = upperCase ? value.toUpperCase() : value;
    return property.maxLength !== undefined && Array.from(form).length > property.maxLength ? undefined : form;
}

/**
 * Whether a string already has the form a field's facets give.
 *
 * @param property the field
 * @param value the string
 * @returns true when the value keeps the facets
 */
export function keepsFacets(property: SchemaProperty, value: string): boolean {
    return inFacetForm(property, value) === value;
}
