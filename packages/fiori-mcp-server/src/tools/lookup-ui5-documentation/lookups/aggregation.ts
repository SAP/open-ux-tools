// Aggregation lookup: extracts a single control aggregation's documentation, walking the control's
// inheritance chain so inherited aggregations (often declared in an ancestor library) resolve too.

import type { LookupUi5DocumentationInput } from '../../../types/index.js';
import type { AggregationLookupResult, LookupSource, Ui5Aggregation, Ui5Symbol } from '../types.js';
import { resolveMember } from './find-member.js';

// Extracts the aggregations array from a symbol's `ui5-metadata`.
const selectAggregations = (symbol: Ui5Symbol): Ui5Aggregation[] | undefined => symbol['ui5-metadata']?.aggregations;

/**
 * Extracts documentation for a control aggregation, resolving inherited aggregations via the chain.
 *
 * @param chain - The control's inheritance chain `[control, ...ancestors]`.
 * @param params - The tool input (the `member` field names the aggregation).
 * @param source - Provenance of the api.json that produced the chain.
 * @returns Structured aggregation documentation.
 * @throws {Error} When the aggregation is not found in the chain.
 */
export function lookupAggregation(
    chain: Ui5Symbol[],
    params: LookupUi5DocumentationInput,
    source: LookupSource
): AggregationLookupResult {
    const { library, control, member } = params;

    const { member: agg, definedIn } = resolveMember(chain, selectAggregations, member, control, {
        singular: 'Aggregation',
        plural: 'aggregations'
    });
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
