import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import { SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/** The V2 `sap:semantics` value of a unit-of-measure field. */
const SAP_V2_SEMANTICS_UNIT = 'unit-of-measure';

/**
 * Whether metadata says a string field holds the unit of a measured field: a `Measures.Unit` annotation of
 * another field names it, or its own V2 `sap:semantics` is `unit-of-measure`. A field that a measured field
 * also names as its currency is not one; a V2 `sap:unit` alone names a unit or a currency, so it does not
 * decide.
 *
 * @param entity the field's entity
 * @param property the field
 * @returns true for a unit field
 */
function isUnitField(entity: SchemaEntity, property: SchemaProperty): boolean {
    if (
        property.primitiveType !== 'string' ||
        entity.properties.some(({ links }) => links?.currency === property.name)
    ) {
        return false;
    }
    const measured = entity.properties.some(
        (owner) =>
            owner.links?.unit === property.name &&
            owner.annotations.some(({ term }) => {
                const normalized = term.toLowerCase();
                return normalized.endsWith(VOCABULARY_TERM_SUFFIX.unit) && normalized.includes('measures');
            })
    );
    return (
        measured ||
        property.annotations.some(
            ({ term, value }) =>
                term.toLowerCase() === SAP_V2_TERM.semantics &&
                typeof value === 'string' &&
                value.toLowerCase() === SAP_V2_SEMANTICS_UNIT
        )
    );
}

/**
 * Unit fields hold units: a field metadata marks as a unit field fails when most of its values are neither a
 * UN/ECE Recommendation 20 common code nor a unit symbol of it, compared without case. A minority of other
 * values is tolerated, since systems use their own codes for some units (`PSI`). Without the unit references
 * the check is skipped.
 *
 * @param input check input
 * @returns findings and coverage
 */
export function checkUnitFields(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.unitField);
    if (!input.units) {
        return collector.outcome();
    }
    const units = new Set([...input.units].map((unit) => unit.toUpperCase()));
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties.filter((candidate) => isUnitField(entity, candidate))) {
            const values = rows
                .map((row) => row[property.name])
                .filter((value): value is string => typeof value === 'string' && value !== '');
            const others = values.filter((value) => !units.has(value.toUpperCase()));
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: values.length,
                failing: others.length * 2 > values.length ? others : []
            });
        }
    }
    return collector.outcome();
}
