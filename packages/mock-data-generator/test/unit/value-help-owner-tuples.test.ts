import { readFileSync } from 'node:fs';
import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataServiceRequest } from '../../src/types.js';

const METADATA = readFileSync(new URL('fixtures/value-help-tuples.metadata.xml', import.meta.url), 'utf8');

const request: MockDataServiceRequest = {
    metadata: { format: 'edmx', content: METADATA },
    service: { urlPath: '/bookings', odataVersion: '2.0' },
    targets: ['Bookings', 'CostCenters', 'CompanyCodes', 'ProfitCenters', 'ControllingAreas', 'Segments'].map(
        (name) => ({ name, kind: 'entity-set' })
    ),
    existingData: {}
};

describe('value-help rows added for the tuples of owner rows', () => {
    it('keep their tuple when the value help projects its own value lists', async () => {
        // Given bookings whose profit center, controlling area and segment a profit-center value help must hold,
        // and that value help reading its own segment from the segments
        // When ten rows of every entity set are generated
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 1, rowsPerEntity: 10 });

        // Then every booking finds its tuple in the value help
        const { Bookings: bookings, ProfitCenters: profitCenters } = result.resources;
        const tuple = (row: Record<string, unknown>, profitCenter: string): string =>
            JSON.stringify([row.ControllingArea, row[profitCenter], row.Segment]);
        const held = new Set(profitCenters.map((row) => tuple(row, 'ProfitCenter')));
        expect(bookings.filter((booking) => !held.has(tuple(booking, 'ProfitCenter')))).toEqual([]);

        // And the value help grows by at most one row per booking and value list that reads it, not again for a
        // row whose tuple a later pass rewrote
        // (the value help grows beyond its own rows, so the test exercises the rows added for owner tuples)
        const listsReadingProfitCenters = 2;
        expect(profitCenters.length).toBeGreaterThan(10);
        expect(profitCenters.length).toBeLessThanOrEqual(10 + bookings.length * listsReadingProfitCenters);
    });
});
