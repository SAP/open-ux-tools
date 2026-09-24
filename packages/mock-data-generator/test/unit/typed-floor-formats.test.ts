import { generateDeterministicResources } from '../../src/generation/deterministic.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    annotations: [],
    ...options
});

/**
 * Rows of one entity set generated on the typed floor (no classifier, no model).
 *
 * @param properties the entity's properties
 * @param rows rows to generate
 * @returns the generated rows
 */
function rowsOf(properties: ReadonlyArray<SchemaProperty>, rows = 12): ReadonlyArray<Record<string, unknown>> {
    const graph: SchemaGraph = {
        namespace: 'formats',
        entities: [{ name: 'SettlementRule', entitySetName: 'SettlementRules', properties: [...properties] }],
        relationships: []
    };
    return generateDeterministicResources(graph, [{ name: 'SettlementRules', kind: 'entity-set' }], {
        rowsPerEntity: rows,
        seed: 17
    }).resources.SettlementRules as ReadonlyArray<Record<string, unknown>>;
}

describe('plain typed-floor formatting', () => {
    it('gives identifier keys zero-padded numbers and other string keys readable codes, all distinct', () => {
        const rows = rowsOf([
            property('RuleID', { isKey: true, nullable: false, maxLength: 8 }),
            property('SettlementType', { isKey: true, nullable: false, maxLength: 6 })
        ]);
        const identifiers = rows.map(({ RuleID }) => RuleID as string);
        const codes = rows.map(({ SettlementType }) => SettlementType as string);

        expect(identifiers.every((value) => /^\d{8}$/u.test(value))).toBe(true);
        expect(codes.every((value) => /^ST\d{4}$/u.test(value))).toBe(true);
        expect(new Set(rows.map((row) => `${String(row.RuleID)}|${String(row.SettlementType)}`)).size).toBe(
            rows.length
        );
    });

    it('keeps compact base-36 keys for columns shorter than four characters', () => {
        const rows = rowsOf([property('Area', { isKey: true, nullable: false, maxLength: 3 })]);
        expect(rows.every(({ Area }) => /^[0-9A-Z]{3}$/u.test(String(Area)))).toBe(true);
        expect(new Set(rows.map(({ Area }) => Area)).size).toBe(rows.length);
    });

    it('fits string values to their declared length instead of cutting a label', () => {
        const [row] = rowsOf(
            [
                property('ID', { isKey: true, nullable: false, maxLength: 10 }),
                property('SettlementType', { maxLength: 3 }),
                property('DistributionSourceAssignment', { maxLength: 12 }),
                property('ControllingArea', { maxLength: 40 }),
                property('RuleCode', { maxLength: 8 }),
                property('Flag', { maxLength: 1 })
            ],
            1
        );

        expect(row?.SettlementType).toMatch(/^ST\d$/u);
        expect(row?.DistributionSourceAssignment).toBe('Assignment 1');
        expect(row?.ControllingArea).toBe('Controlling Area 1');
        expect(row?.RuleCode).toMatch(/^R\d{5}$/u);
        expect(row?.Flag).toBe('A');
    });

    it('sizes decimals by precision and scale with at most four integer digits', () => {
        const rows = rowsOf([
            property('ID', { isKey: true, nullable: false, maxLength: 10 }),
            property('Amount', { primitiveType: 'decimal', precision: 15, scale: 2 }),
            property('Rate', { primitiveType: 'decimal', precision: 3, scale: 3 }),
            property('Plain', { primitiveType: 'decimal' })
        ]);

        for (const row of rows) {
            expect(Math.abs(row.Amount as number)).toBeLessThan(10_000);
            expect(String(row.Amount).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
            expect(row.Rate as number).toBeLessThan(1);
            expect(Math.abs(row.Plain as number)).toBeLessThan(10_000);
        }
    });
});
