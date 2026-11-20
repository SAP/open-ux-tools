import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateServiceForTesting } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { SchemaGraph } from '../../src/schema/graph.js';
import type { MockDataRow, MockDataServiceRequest } from '../../src/types.js';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const UNIT = fileURLToPath(new URL('.', import.meta.url));

/** Services of different domains and protocol versions, and one whose names mean nothing. */
const SERVICES = [
    ['travel-v2', join(UNIT, 'travel-v2.metadata.xml'), '2.0'],
    ['incident-management', join(FIXTURES, 'incident-management.metadata.xml'), '4.0'],
    ['navigation-fallback', join(FIXTURES, 'navigation-fallback.metadata.xml'), '4.0']
] as const;

/**
 * The entity sets another set's value list reads: their supplied rows are the whole list, so nothing is added to
 * them and they are left out of this test.
 *
 * @param graph - The service schema.
 * @returns The names of the value-list sets.
 */
function domainSets(graph: SchemaGraph): Set<string> {
    return new Set(
        graph.entities.flatMap(({ properties }) =>
            properties.flatMap(({ links }) => (links?.valueListCollection ? [links.valueListCollection] : []))
        )
    );
}

describe('rows generated next to existing rows that share a key', () => {
    it.each(SERVICES)(
        'are generated for %s, and the existing rows stay as written',
        async (_name, path, odataVersion) => {
            // Given rows of an earlier run where the first row is written twice, as a hand edit or another tool may leave it
            const content = readFileSync(path, 'utf8');
            const graph = parseEdmx(content);
            const domains = domainSets(graph);
            const targets = graph.entities.filter(({ containedBy }) => containedBy === undefined);
            const request = (existingData: MockDataServiceRequest['existingData']): MockDataServiceRequest => ({
                metadata: { format: 'edmx', content },
                service: { urlPath: '/duplicate-keys', odataVersion },
                targets: targets.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' as const })),
                existingData
            });
            const earlier = await generateServiceForTesting(request({}), { seed: 1, rowsPerEntity: 10 });
            const supplied = targets.filter(
                ({ entitySetName, properties }) =>
                    !domains.has(entitySetName) &&
                    properties.some(({ isKey }) => isKey) &&
                    (earlier.resources[entitySetName]?.length ?? 0) >= 2
            );
            const suppliedRows = (entitySetName: string): MockDataRow[] => {
                const [first, second] = earlier.resources[entitySetName] ?? [];
                return [first, first, second];
            };
            const existingData = Object.fromEntries(
                supplied.map(({ entitySetName }) => [
                    entitySetName,
                    {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows: suppliedRows(entitySetName) }
                    } as const
                ])
            );
            // When rows are generated next to them
            const result = await generateServiceForTesting(request(existingData), { seed: 1, rowsPerEntity: 10 });
            expect(supplied.length).toBeGreaterThan(0);
            for (const { entitySetName, properties } of supplied) {
                const rows = result.resources[entitySetName] ?? [];
                const keys = properties.filter(({ isKey }) => isKey);
                const signature = (row: MockDataRow): string => JSON.stringify(keys.map(({ name }) => row[name]));
                const existing = suppliedRows(entitySetName);
                // Then the existing rows lead the set exactly as written
                expect(rows.slice(0, existing.length)).toEqual(existing);
                // And every new row has a key of its own, not one an existing row holds
                const taken = new Set(existing.map(signature));
                const added = rows.slice(existing.length).map(signature);
                expect(added.length).toBeGreaterThan(0);
                expect(new Set(added).size).toBe(added.length);
                expect(added.filter((key) => taken.has(key))).toEqual([]);
                // And the repeated key is reported
                expect(result.diagnostics).toContainEqual(
                    expect.objectContaining({
                        code: 'SUPPLIED_KEY_DUPLICATED',
                        severity: 'warning',
                        target: entitySetName
                    })
                );
            }
        },
        120_000
    );
});
