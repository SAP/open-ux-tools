import { readFileSync } from 'node:fs';
import { generateServiceForTesting } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { finalizeSemanticServiceWorld } from '../../src/generation/service-world.js';
import { generateDeterministicResources } from '../../src/generation/deterministic.js';
import {
    compileTemporalPlan,
    reconcileTemporalPlan,
    validateTemporalPlan
} from '../../src/generation/temporal-plan.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { MockDataGeneratorDiagnostic } from '../../src/types.js';
import { travelAuthoredValueHelpEvidence } from './travel-authored-value-helps.js';

function graphFor(labels: readonly string[]): SchemaGraph {
    return {
        namespace: 'test',
        relationships: [],
        entities: [
            {
                name: 'Record',
                entitySetName: 'Records',
                properties: labels.map((label, index): SchemaProperty => ({
                    name: `D${index}`,
                    label,
                    primitiveType: 'date',
                    nullable: false,
                    isKey: false,
                    annotations: []
                }))
            }
        ]
    };
}

describe('service-wide temporal constraints', () => {
    test('never rewrites generated temporal keys when inferred coherence is enabled', () => {
        const graph = graphFor(['Start Date', 'End Date']);
        graph.entities[0].properties[0].name = 'StartDate';
        graph.entities[0].properties[1].name = 'EndDate';
        graph.entities[0].properties[1].isKey = true;
        const targets = [{ name: 'Records', kind: 'entity-set' as const }];
        const enabled = generateDeterministicResources(graph, targets, {
            seed: 1,
            rowsPerEntity: 2
        });
        const disabled = generateDeterministicResources(graph, targets, {
            seed: 1,
            rowsPerEntity: 2,
            syntheticScenario: { id: 'test', version: '1', domains: {}, coherence: { Records: [] } }
        });
        expect(enabled.resources.Records.map((row) => row.EndDate)).toEqual(
            disabled.resources.Records.map((row) => row.EndDate)
        );
    });

    test('explicit temporal ordering disables conflicting deterministic inference', () => {
        const graph = graphFor(['Start Date', 'End Date']);
        graph.entities[0].properties = [
            ...graph.entities[0].properties,
            {
                name: 'ID',
                primitiveType: 'int',
                isKey: true,
                nullable: false,
                annotations: []
            }
        ];
        graph.entities[0].properties[0].name = 'StartDate';
        graph.entities[0].properties[1].name = 'EndDate';
        const targets = [{ name: 'Records', kind: 'entity-set' as const }];
        const explicit = generateDeterministicResources(graph, targets, {
            seed: 1,
            rowsPerEntity: 10,
            syntheticScenario: {
                id: 'test',
                version: '1',
                domains: {},
                temporalConstraints: [{ resource: 'Records', before: 'EndDate', after: 'StartDate' }]
            }
        });
        const disabled = generateDeterministicResources(graph, targets, {
            seed: 1,
            rowsPerEntity: 10,
            syntheticScenario: { id: 'test', version: '1', domains: {}, coherence: { Records: [] } }
        });
        expect(explicit.resources).toEqual(disabled.resources);
    });
    test.each(['Birth Date', 'Unknown Date'])('does not infer ordering against unrelated %s', (label) => {
        expect(compileTemporalPlan(graphFor(['Booking Date', label])).constraints).toEqual([]);
    });

    test('honors explicitly disabled inferred temporal coherence', () => {
        const graph = graphFor(['Booking Date', 'Event Date']);
        const rows = [{ D0: '2025-01-01', D1: '2024-01-01' }];
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        expect(
            finalizeSemanticServiceWorld({
                graph,
                resources: { Records: rows },
                existingData: {},
                seed: 42,
                classifications: new Map(),
                diagnostics,
                coherence: { Records: [] }
            }).Records
        ).toEqual(rows);
        expect(diagnostics).toEqual([]);
    });
    test('accepts explicit ordering for opaque fields and reports unknown fields and cycles', () => {
        const graph = graphFor(['Opaque A', 'Opaque B', 'Opaque C']);
        expect(compileTemporalPlan(graph).constraints).toEqual([]);
        const edges = [
            { resource: 'Records', before: 'D0', after: 'D1' },
            { resource: 'Records', before: 'D1', after: 'D2' }
        ];
        expect(compileTemporalPlan(graph, edges).constraints).toHaveLength(2);
        const invalid = compileTemporalPlan(graph, [
            ...edges,
            { resource: 'Records', before: 'D2', after: 'D0' },
            { resource: 'Missing', before: 'D0', after: 'D1' }
        ]);
        expect(invalid.constraints).toHaveLength(0);
        expect(invalid.diagnostics).toHaveLength(4);
        expect(invalid.diagnostics.every(({ code }) => code === 'TEMPORAL_CONSTRAINT_INVALID')).toBe(true);
    });

    test('explicit constraints override inferred ordering and propagate along chains', () => {
        const graph = graphFor(['Booking Date', 'Event Date', 'Opaque']);
        const constraints = [
            { resource: 'Records', before: 'D2', after: 'D1' },
            { resource: 'Records', before: 'D1', after: 'D0' }
        ];
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        const rows = reconcileTemporalPlan(
            graph,
            { Records: [{ D0: '2021-01-01', D1: '2024-01-01', D2: '2025-01-01' }] },
            new Map(),
            diagnostics,
            constraints
        );
        expect(validateTemporalPlan(graph, rows, constraints)).toEqual([]);
        expect(diagnostics).toEqual([]);
    });

    test('moves a date written at the instant of an earlier-declared, unrelated date later', () => {
        // Given two dates whose labels name no ordered pair, written at one instant in every row
        const graph = graphFor(['Qx Zv', 'Wk Pr']);
        const instants = ['2021-03-04', '2022-07-19', '2023-01-30', '2023-11-02', '2024-05-21', '2025-02-08'];
        const resources = { Records: instants.map((day) => ({ D0: day, D1: day })) };
        // When the temporal plan reconciles them
        const rows = reconcileTemporalPlan(graph, resources, new Map(), []).Records;
        // Then the later-declared date never precedes the earlier one, and differs from it in most rows
        expect(rows.every((row) => String(row.D1) >= String(row.D0))).toBe(true);
        expect(rows.filter((row) => row.D1 !== row.D0).length).toBeGreaterThan(instants.length / 2);
        expect(rows.map((row) => row.D0)).toEqual(instants);
    });

    test.each([
        ['time', (index: number): string => `${String(index).padStart(2, '0')}:15:00`],
        ['datetimeoffset', (index: number): string => `20${10 + index}-03-04T08:15:00.000Z`]
    ] as const)('moves every %s written at the instant of an earlier-declared, unrelated one later', (type, at) => {
        // Given two fields of a type finer than a day whose labels name no ordered pair, at one instant in every row
        const graph = graphFor(['Qx Zv', 'Wk Pr']);
        graph.entities[0].properties.forEach((property) => (property.primitiveType = type));
        const instants = Array.from({ length: 20 }, (_instant, index) => at(index));
        const resources = { Records: instants.map((instant) => ({ D0: instant, D1: instant })) };
        // When the temporal plan reconciles them
        const rows = reconcileTemporalPlan(graph, resources, new Map(), []).Records;
        // Then no row puts two events at one instant, and the later-declared one follows the earlier one
        expect(rows.filter((row) => row.D1 === row.D0)).toEqual([]);
        expect(rows.every((row) => String(row.D1) > String(row.D0))).toBe(true);
    });

    test.each(['time', 'datetimeoffset'] as const)('never ends a %s interval at its start', (type) => {
        // Given a start and an end finer than a day, written at one instant in every row
        const graph = graphFor(['Start Time', 'End Time']);
        graph.entities[0].properties.forEach((property) => (property.primitiveType = type));
        const instants = Array.from({ length: 20 }, (_instant, index) =>
            type === 'time' ? `${String(index).padStart(2, '0')}:15:00` : `20${10 + index}-03-04T08:15:00.000Z`
        );
        const resources = { Records: instants.map((instant) => ({ D0: instant, D1: instant })) };
        // When the temporal plan reconciles them
        const rows = reconcileTemporalPlan(graph, resources, new Map(), []).Records;
        // Then every interval has a length
        expect(rows.filter((row) => String(row.D1) <= String(row.D0))).toEqual([]);
    });

    test('lets a change keep the instant of its creation in some rows', () => {
        // Given a creation and a change timestamp, written at one instant in every row
        const graph = graphFor(['Created At', 'Changed At']);
        graph.entities[0].properties.forEach((property) => (property.primitiveType = 'datetimeoffset'));
        const instants = Array.from(
            { length: 40 },
            (_instant, index) => `20${10 + (index % 20)}-03-0${1 + (index % 9)}T08:15:00.000Z`
        );
        const resources = { Records: instants.map((instant) => ({ D0: instant, D1: instant })) };
        // When the temporal plan reconciles them
        const rows = reconcileTemporalPlan(graph, resources, new Map(), []).Records;
        // Then a record that was never changed keeps its creation instant, and every other change follows it
        expect(rows.some((row) => row.D1 === row.D0)).toBe(true);
        expect(rows.every((row) => String(row.D1) >= String(row.D0))).toBe(true);
    });

    test('leaves an ordered pair to its own spread and a protected date unchanged', () => {
        // Given a start and an end date and an unrelated protected date, all at one instant
        const graph = graphFor(['Start Date', 'End Date', 'Qx Zv']);
        graph.entities[0].properties[0].name = 'StartDate';
        graph.entities[0].properties[1].name = 'EndDate';
        const rows = Array.from({ length: 6 }, (_row, index) => {
            const day = `2024-0${index + 1}-15`;
            return { StartDate: day, EndDate: day, D2: day };
        });
        // When the temporal plan reconciles them
        const result = reconcileTemporalPlan(graph, { Records: rows }, new Map([['Records', new Set(['D2'])]]), []);
        // Then the end follows the start and the protected date keeps its value
        expect(result.Records.every((row) => String(row.EndDate) >= String(row.StartDate))).toBe(true);
        expect(result.Records.map((row) => row.D2)).toEqual(rows.map((row) => row.D2));
    });

    test.each(['key', 'enum', 'projection'])('never changes a protected %s date', (kind) => {
        const graph = graphFor(['Start Date', 'End Date']);
        const property = graph.entities[0].properties[0];
        property.isKey = kind === 'key';
        property.enumValues = kind === 'enum' ? ['2025-01-01'] : undefined;
        const protectedProperties = new Map([['Records', new Set(kind === 'projection' ? ['D0'] : [])]]);
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        const result = reconcileTemporalPlan(
            graph,
            { Records: [{ D0: '2025-01-01', D1: '2024-01-01' }] },
            protectedProperties,
            diagnostics
        );
        expect(result.Records[0]).toEqual({ D0: '2025-01-01', D1: '2025-01-01' });
        expect(validateTemporalPlan(graph, result)).toEqual([]);
    });

    test('does not guess ambiguous event semantics and validates malformed non-null dates', () => {
        const graph = graphFor(['Booking Date', 'Flight Date', 'Delivery Date']);
        expect(compileTemporalPlan(graph).constraints).toEqual([]);
        expect(
            validateTemporalPlan(graph, { Records: [{ D0: 'invalid', D1: '2024-01-01' }] }, [
                { resource: 'Records', before: 'D0', after: 'D1' }
            ])
        ).toEqual([expect.objectContaining({ code: 'TEMPORAL_CONSTRAINT_VIOLATION' })]);
        expect(
            validateTemporalPlan(graph, { Records: [{ D0: null, D1: '2024-01-01' }] }, [
                { resource: 'Records', before: 'D0', after: 'D1' }
            ])
        ).toEqual([]);
    });

    test('supports time and timestamp audit fields and protects impossible enum constraints', () => {
        const graph = graphFor(['Created Date', 'Changed Date']);
        graph.entities[0].properties.forEach((property) => {
            property.primitiveType = 'time';
        });
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        const result = reconcileTemporalPlan(
            graph,
            { Records: [{ D0: '12:00:00', D1: '11:00:00' }] },
            new Map(),
            diagnostics
        );
        expect(result.Records[0]).toEqual({ D0: '11:00:00', D1: '12:00:00' });
        graph.entities[0].properties[0].enumValues = ['12:00:00'];
        graph.entities[0].properties[1].enumValues = ['11:00:00'];
        const conflict: MockDataGeneratorDiagnostic[] = [];
        const fixed = reconcileTemporalPlan(
            graph,
            { Records: [{ D0: '12:00:00', D1: '11:00:00' }] },
            new Map(),
            conflict
        );
        expect(fixed.Records[0]).toEqual({ D0: '12:00:00', D1: '11:00:00' });
        expect(conflict.some(({ code }) => code === 'TEMPORAL_CONSTRAINT_VIOLATION')).toBe(true);
    });

    test.each([
        ['Booking Date', 'Flight Date'],
        ['Order Date', 'Delivery Date'],
        ['Reservation Date', 'Appointment Date']
    ])('does not order %s and %s, which words alone cannot order', (before, after) => {
        // Given two business dates and no explicit constraint, Then the plan orders nothing
        expect(compileTemporalPlan(graphFor([before, after])).constraints).toEqual([]);
    });

    test('reports conflicting authored audit dates without swapping them', () => {
        const graph = graphFor(['Created Date', 'Changed Date']);
        graph.entities[0].properties[0].name = 'CreatedDate';
        graph.entities[0].properties[1].name = 'ChangedDate';
        const rows = [{ CreatedDate: '2025-01-01', ChangedDate: '2024-01-01' }];
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        const result = finalizeSemanticServiceWorld({
            graph,
            resources: { Records: rows },
            existingData: {
                Records: { contributor: { present: false }, initialRows: { present: true, source: 'json', rows } }
            },
            seed: 42,
            classifications: new Map(),
            diagnostics
        });
        expect(result.Records).toEqual(rows);
        expect(diagnostics.some(({ code }) => code === 'TEMPORAL_CONSTRAINT_VIOLATION')).toBe(true);
    });

    test('keeps referenced event date keys unique in the generated business date range', async () => {
        const content = readFileSync(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
        const graph = parseEdmx(content);
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/temporal', odataVersion: '2.0' },
                targets: graph.entities.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' })),
                existingData: travelAuthoredValueHelpEvidence
            },
            { seed: 42, rowsPerEntity: 10 }
        );
        expect(result.resources.Booking.every((row) => String(row.FlightDate) >= '2020-01-01')).toBe(true);
        expect(
            new Set(
                result.resources.Flight.map((row) => JSON.stringify([row.AirlineID, row.ConnectionID, row.FlightDate]))
            ).size
        ).toBe(result.resources.Flight.length);
    });
});
