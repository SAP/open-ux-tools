import { readFileSync } from 'node:fs';
import { generateServiceForTesting as generate } from '../../src/index.js';
import { REALISM_CHECKS_VERSION } from '../../src/quality/realism.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { MockDataServiceRequest } from '../../src/types.js';

/**
 * A service of one entity with a start and an end date, and the rows the caller supplies for it.
 *
 * @param rows the supplied rows
 * @returns the request
 */
function intervalRequest(rows: ReadonlyArray<Record<string, unknown>>): MockDataServiceRequest {
    return {
        metadata: {
            format: 'csn',
            content: JSON.stringify({
                definitions: {
                    'Realism.Contracts': {
                        kind: 'entity',
                        elements: {
                            ID: { key: true, type: 'cds.Integer', notNull: true },
                            StartDate: { type: 'cds.Date' },
                            EndDate: { type: 'cds.Date' }
                        }
                    }
                }
            })
        },
        service: { urlPath: '/realism', odataVersion: '4.0' },
        targets: [{ name: 'Contracts', kind: 'entity-set' }],
        existingData: {
            Contracts: { contributor: { present: false }, initialRows: { source: 'json', present: true, rows } }
        }
    } as MockDataServiceRequest;
}

describe('result realism', () => {
    it('reports that the generated rows of a fixture service pass the hard realism checks', async () => {
        // Given a fixture service
        const content = readFileSync(new URL('travel-v2.metadata.xml', import.meta.url), 'utf8');
        const entitySets = new Set(parseEdmx(content).entities.map((entity) => entity.entitySetName));
        const request: MockDataServiceRequest = {
            metadata: { format: 'edmx', content },
            service: { urlPath: '/travel', odataVersion: '2.0' },
            targets: [...entitySets].map((name) => ({ name, kind: 'entity-set' })),
            existingData: {}
        };

        // When rows are generated for every entity set
        const result = await generate(request, { seed: 1, rowsPerEntity: 5 });

        // Then the result says which checks ran and that no generated field fails one
        expect(Object.values(result.resources).flat().length).toBeGreaterThan(0);
        expect(result.realism).toEqual({ checksVersion: REALISM_CHECKS_VERSION, failingFields: 0, passed: true });
    });

    it('does not hold the generator to account for rows the caller supplied', async () => {
        // Given supplied rows whose start lies after their end in every row
        const supplied = [
            { ID: 1, StartDate: '2024-05-01', EndDate: '2024-01-01' },
            { ID: 2, StartDate: '2024-06-01', EndDate: '2024-02-01' },
            { ID: 3, StartDate: '2024-07-01', EndDate: '2024-03-01' }
        ];

        // When the entity is generated around them
        const result = await generate(intervalRequest(supplied), { seed: 1, rowsPerEntity: 3 });

        // Then the supplied rows are kept as given and do not fail the run
        expect(result.resources.Contracts).toEqual(supplied.map((row) => expect.objectContaining(row)));
        expect(result.realism?.passed).toBe(true);
    });
});
