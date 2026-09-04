// Aggregation lookup: extracts a single control aggregation's documentation, walking the control's
// inheritance chain so inherited aggregations (often declared in an ancestor library) resolve too.

import type { LookupUi5DocumentationInput } from '../../../types/index.js';
import type { AggregationLookupResult, LookupSource, Ui5Aggregation, Ui5Symbol } from '../types.js';
import { findMemberInChain, knownMemberNames } from './find-member.js';

// Extracts the aggregations array from a symbol's `ui5-metadata`.
const selectAggregations = (symbol: Ui5Symbol): Ui5Aggregation[] | undefined => symbol['ui5-metadata']?.aggregations;

/**
 * Extracts documentation for a control aggregation, resolving inherited aggregations via the chain.
 *
 * @param chain - The control's inheritance chain `[control, ...ancestors]`.
 * @param params - The tool input (the `member` field names the aggregation and is required).
 * @param source - Provenance of the api.json that produced the chain.
 * @returns Structured aggregation documentation.
 * @throws {Error} When the `member` input is missing or the aggregation is not found in the chain.
 */
export function lookupAggregation(
    chain: Ui5Symbol[],
    params: LookupUi5DocumentationInput,
    source: LookupSource
): AggregationLookupResult {
    const { library, control, member } = params;
    if (!member) {
        throw new Error('The "member" parameter is required when lookupType is "aggregation".');
    }

    const found = findMemberInChain(chain, selectAggregations, member);
    if (!found) {
        const known = knownMemberNames(chain, selectAggregations);
        throw new Error(
            `Aggregation ${member} not found on ${control} or its ancestors. ` +
                `Known aggregations: ${known.length ? known.join(', ') : '(none)'}.`
        );
    }

    const { member: agg, definedIn } = found;
    return {
        lookupType: 'aggregation',
        library,
        control,
        definedIn,
        inherited: definedIn !== control,
        aggregation: agg.name,
        type: agg.type,
        cardinality: agg.cardinality,
        visibility: agg.visibility,
        since: agg.since ?? null,
        description: agg.description ?? null,
        source
    };
}
