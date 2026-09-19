import type { LookupUi5DocumentationInput } from '../../../types/index.js';
import type { LookupSource, PropertyLookupResult, Ui5Property, Ui5Symbol } from '../types.js';
import { resolveMember } from './find-member.js';

const selectProperties = (symbol: Ui5Symbol): Ui5Property[] | undefined => symbol['ui5-metadata']?.properties;

/**
 * Extracts documentation for a control property, resolving inherited properties via the chain.
 *
 * @param chain - The control's inheritance chain `[control, ...ancestors]`.
 * @param params - The tool input (the `member` field names the property).
 * @param source - Provenance of the api.json that produced the chain.
 * @returns Structured property documentation.
 * @throws {Error} When the property is not found in the chain.
 */
export function lookupProperty(
    chain: Ui5Symbol[],
    params: LookupUi5DocumentationInput,
    source: LookupSource
): PropertyLookupResult {
    const { library, control, member } = params;

    const { member: prop, definedIn } = resolveMember(chain, selectProperties, member, control, {
        singular: 'Property',
        plural: 'properties'
    });
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
