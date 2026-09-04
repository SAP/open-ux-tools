// Property lookup: extracts a single control property's documentation, walking the control's
// inheritance chain so inherited properties (often declared in an ancestor library) resolve too.

import type { LookupUi5DocumentationInput } from '../../../types/index.js';
import type { LookupSource, PropertyLookupResult, Ui5Property, Ui5Symbol } from '../types.js';
import { findMemberInChain, knownMemberNames } from './find-member.js';

// Extracts the properties array from a symbol's `ui5-metadata`.
const selectProperties = (symbol: Ui5Symbol): Ui5Property[] | undefined => symbol['ui5-metadata']?.properties;

/**
 * Extracts documentation for a control property, resolving inherited properties via the chain.
 *
 * @param chain - The control's inheritance chain `[control, ...ancestors]`.
 * @param params - The tool input (the `member` field names the property and is required).
 * @param source - Provenance of the api.json that produced the chain.
 * @returns Structured property documentation.
 * @throws {Error} When the `member` input is missing or the property is not found in the chain.
 */
export function lookupProperty(
    chain: Ui5Symbol[],
    params: LookupUi5DocumentationInput,
    source: LookupSource
): PropertyLookupResult {
    const { library, control, member } = params;
    if (!member) {
        throw new Error('The "member" parameter is required when lookupType is "property".');
    }

    const found = findMemberInChain(chain, selectProperties, member);
    if (!found) {
        const known = knownMemberNames(chain, selectProperties);
        throw new Error(
            `Property ${member} not found on ${control} or its ancestors. ` +
                `Known properties: ${known.length ? known.join(', ') : '(none)'}.`
        );
    }

    const { member: prop, definedIn } = found;
    return {
        lookupType: 'property',
        library,
        control,
        definedIn,
        inherited: definedIn !== control,
        property: prop.name,
        type: prop.type,
        defaultValue: prop.defaultValue,
        group: prop.group,
        visibility: prop.visibility,
        bindable: prop.bindable,
        since: prop.since ?? null,
        description: prop.description ?? null,
        source
    };
}
