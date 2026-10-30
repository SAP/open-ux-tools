import { finalCheckFailures, undoChangesBreakingFinalChecks } from '../../src/generation/final-checks.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    annotations: [],
    ...options
});

/** Carriers keyed by a code, and flights whose carrier comes from the carrier value list. */
const carriers: SchemaEntity = {
    name: 'Carrier',
    entitySetName: 'Carriers',
    properties: [
        property('CarrierID', { isKey: true, nullable: false, maxLength: 3 }),
        property('CarrierName', { maxLength: 40 }),
        property('Homepage', { maxLength: 80 })
    ]
};
const flights: SchemaEntity = {
    name: 'Flight',
    entitySetName: 'Flights',
    properties: [
        property('FlightID', { primitiveType: 'int', isKey: true, nullable: false }),
        property('CarrierID', {
            maxLength: 3,
            links: {
                valueListCollection: 'Carriers',
                valueListParameters: [
                    { direction: 'InOut', localProperty: 'CarrierID', valueListProperty: 'CarrierID' },
                    { direction: 'Out', localProperty: 'CarrierName', valueListProperty: 'CarrierName' }
                ]
            }
        }),
        property('CarrierName', { maxLength: 40 })
    ]
};
const graph: SchemaGraph = { namespace: 'Demo', entities: [carriers, flights], relationships: [] };
const roles = { 'Carriers.Homepage': 'url' };

const before = {
    Carriers: [{ CarrierID: 'AA', CarrierName: 'Air A', Homepage: 'https://air-a.example' }],
    Flights: [{ FlightID: 1, CarrierID: 'AA', CarrierName: 'Air A' }]
};

describe('final checks', () => {
    it('name the fields whose role or value-list tuple fails', () => {
        // Given rows whose homepage is no URL and whose flight shows a carrier name no carrier has
        const rows = {
            Carriers: [{ CarrierID: 'AA', CarrierName: 'Air A', Homepage: 'Homepage_0' }],
            Flights: [{ FlightID: 1, CarrierID: 'AA', CarrierName: 'CarrierName_0' }]
        };

        // When the final checks run
        const failures = finalCheckFailures(graph, rows, {}, roles);

        // Then both fields fail, and rows that agree pass
        expect([...failures].sort()).toEqual(['Carriers.Homepage', 'Flights.CarrierID']);
        expect([...finalCheckFailures(graph, before, {}, roles)]).toEqual([]);
    });

    it('undo the changes of a step that break a check that passed before it', () => {
        // Given a step that wrote a name into the carrier homepage and changed the flight's carrier text
        const after = {
            Carriers: [{ CarrierID: 'AA', CarrierName: 'Air A', Homepage: 'Homepage_0' }],
            Flights: [{ FlightID: 1, CarrierID: 'AA', CarrierName: 'CarrierName_0' }]
        };

        // When its changes are checked
        const result = undoChangesBreakingFinalChecks(graph, before, after, {}, roles);

        // Then both entity sets are as they were before the step and both changed cells are counted
        expect(result.resources).toEqual(before);
        expect(result.reverted).toBe(2);
    });

    it('keep the changes that break nothing', () => {
        // Given a step that only filled the flight's carrier text with the carrier's name
        const start = { ...before, Flights: [{ FlightID: 1, CarrierID: 'AA', CarrierName: null }] };

        // When its changes are checked
        const result = undoChangesBreakingFinalChecks(graph, start, before, {}, roles);

        // Then the change stays
        expect(result.resources).toEqual(before);
        expect(result.reverted).toBe(0);
    });

    it('leave a failure the step did not cause to the final checks', () => {
        // Given rows whose homepage already failed before the step and a step that changed nothing else
        const broken = { ...before, Carriers: [{ CarrierID: 'AA', CarrierName: 'Air A', Homepage: 'none' }] };

        // When its changes are checked
        const result = undoChangesBreakingFinalChecks(graph, broken, broken, {}, roles);

        // Then nothing is restored
        expect(result.resources.Carriers).toBe(broken.Carriers);
        expect(result.reverted).toBe(0);
    });
});
