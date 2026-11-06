import { activeDraftValue } from '../generation/draft-state.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/**
 * Every generated row of a draft-enabled entity is an active instance without a draft, as a mockserver loads
 * mock data and the app expects it: a row that says it has a draft, or is one, opens an object page whose draft
 * does not exist. Each draft administration field of such an entity is examined.
 *
 * @param input check input
 * @returns findings and coverage
 */
export function checkDraftStates(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.draftState);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties) {
            const expected = activeDraftValue(entity, property);
            if (expected === undefined || rows.length === 0) {
                continue;
            }
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: rows.length,
                failing: rows.flatMap((row) => (row[property.name] === expected ? [] : [row[property.name] ?? null]))
            });
        }
    }
    return collector.outcome();
}
