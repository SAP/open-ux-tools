import type { SchemaEntity } from '../schema/graph.js';
import type { JsonValue, MockDataRow } from '../types.js';
import { generatedRows, heldAs, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/** A kind of record identified by an ISO code, with the host's ICU data to recognise its codes and names. */
interface RecordKind {
    isCode: (value: string) => boolean;
    nameOf: (code: string) => string | undefined;
}

/**
 * The record kinds the check knows, from the host's ICU data: ISO 3166 regions and ISO 4217 currencies.
 *
 * @returns the kinds
 */
function recordKinds(): RecordKind[] {
    const regions = new Intl.DisplayNames('en', { type: 'region', fallback: 'none' });
    const currencies = new Intl.DisplayNames('en', { type: 'currency', fallback: 'none' });
    const currencyCodes = new Set(Intl.supportedValuesOf('currency'));
    const regionName = (code: string): string | undefined => {
        try {
            return /^[A-Z]{2}$/u.test(code) ? regions.of(code) : undefined;
        } catch (error) {
            // `Intl.DisplayNames.of` rejects a code it does not know with a RangeError.
            if (error instanceof RangeError) {
                return undefined;
            }
            throw error;
        }
    };
    return [
        { isCode: (value) => regionName(value) !== undefined, nameOf: regionName },
        {
            isCode: (value) => currencyCodes.has(value),
            nameOf: (code) => (currencyCodes.has(code) ? currencies.of(code) : undefined)
        }
    ];
}

/**
 * Whether every examined value of a column satisfies a test.
 *
 * @param values the column's values
 * @param test the test
 * @param minimum the fewest values that make a pattern
 * @returns true when the column is a column of that kind
 */
function columnIs(
    values: ReadonlyArray<JsonValue | undefined>,
    test: (value: string) => boolean,
    minimum: number
): boolean {
    const present = values.filter((value): value is string => typeof value === 'string' && value !== '');
    return present.length >= minimum && present.length === values.length && present.every(test);
}

/**
 * Check one entity whose single key holds codes of one record kind.
 *
 * @param entity the entity
 * @param rows its generated rows
 * @param kind the record kind of its key
 * @param collector receives findings
 * @param minimum the fewest values that make a pattern
 */
function checkRecordEntity(
    entity: SchemaEntity,
    rows: ReadonlyArray<MockDataRow>,
    kind: RecordKind,
    collector: OutcomeCollector,
    minimum: number
): void {
    const key = entity.properties.find(({ isKey }) => isKey)?.name ?? '';
    const names = new Set(rows.map((row) => kind.nameOf(String(row[key]))).filter(Boolean));
    for (const property of entity.properties.filter(
        ({ isKey, primitiveType }) => !isKey && primitiveType === 'string'
    )) {
        const values = rows.map((row) => row[property.name]);
        const heldNames = new Set([...names].map((name) => heldAs(property, name)));
        const codeColumn = columnIs(values, kind.isCode, minimum);
        const nameColumn = !codeColumn && columnIs(values, (value) => heldNames.has(value), minimum);
        if (!codeColumn && !nameColumn) {
            continue;
        }
        const failing = rows.flatMap((row) => {
            const recorded = codeColumn ? row[key] : kind.nameOf(String(row[key]));
            const expected = heldAs(property, recorded);
            // A field whose facets cannot hold the record's value (letters in a digit sequence) is not judged.
            const comparable = recorded === undefined || expected !== undefined;
            return !comparable || row[property.name] === expected ? [] : [row[property.name]];
        });
        collector.field({
            entitySet: entity.entitySetName,
            property: property.name,
            related: `${entity.entitySetName}.${key}`,
            checked: rows.length,
            failing
        });
    }
}

/**
 * A row of a record entity keyed by ISO 3166 or ISO 4217 codes describes one record: same-kind code columns hold the
 * row's code and name columns its name. Codes and names are recognised with the host's ICU data.
 *
 * @param input check input
 * @param minimum the fewest values that make a pattern
 * @returns findings per field
 */
export function checkRecordRows(input: RealismInput, minimum: number): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.recordConsistency);
    const kinds = recordKinds();
    for (const entity of input.graph.entities) {
        const keys = entity.properties.filter(({ isKey }) => isKey);
        const rows = generatedRows(input, entity.entitySetName);
        if (keys.length !== 1 || keys[0].primitiveType !== 'string') {
            continue;
        }
        const kind = kinds.find((candidate) =>
            columnIs(
                rows.map((row) => row[keys[0].name]),
                candidate.isCode,
                minimum
            )
        );
        if (kind) {
            checkRecordEntity(entity, rows, kind, collector, minimum);
        }
    }
    return collector.outcome();
}
