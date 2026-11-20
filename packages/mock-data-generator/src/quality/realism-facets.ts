import { keepsFacets, stringFacets } from '../spec/facets.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/**
 * String values keep the facets their field declares: digits only in a digit-sequence field, upper case in
 * an upper-case field.
 *
 * @param input check input
 * @returns findings and coverage
 */
export function checkFacets(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.facet);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties) {
            const { digits, upperCase } = stringFacets(property);
            if (!digits && !upperCase) {
                continue;
            }
            const values = rows
                .map((row) => row[property.name])
                .filter((value): value is string => typeof value === 'string');
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: values.length,
                failing: values.filter((value) => !keepsFacets(property, value))
            });
        }
    }
    return collector.outcome();
}
