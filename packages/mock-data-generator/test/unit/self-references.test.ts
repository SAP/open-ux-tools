import { readFileSync } from 'node:fs';
import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataRow } from '../../src/types.js';

const FIXTURES = new URL('./fixtures/', import.meta.url);

/**
 * The rows of a parent chain that leads back to a row already on it, for every row of a self-referencing set.
 *
 * @param rows the generated rows
 * @param key the referenced key property
 * @param reference the referencing property
 * @returns the keys of the rows whose parent chain is a cycle
 */
function rowsOnCycles(rows: ReadonlyArray<MockDataRow>, key: string, reference: string): string[] {
    const parentOf = new Map(rows.map((row) => [String(row[key]), row[reference]]));
    return rows
        .map((row) => String(row[key]))
        .filter((start) => {
            const seen = new Set<string>();
            let current: unknown = start;
            while (current !== null && current !== undefined && parentOf.has(String(current))) {
                if (seen.has(String(current))) {
                    return true;
                }
                seen.add(String(current));
                const parent = parentOf.get(String(current));
                // A root may reference itself when its reference is required.
                current = String(parent) === String(current) ? null : parent;
            }
            return false;
        });
}

describe('self-referencing entity sets', () => {
    it.each([
        [
            'csn',
            'feature-showcase.csn.json',
            'LROPODataService',
            'OrganizationalUnits',
            'ID',
            'superOrdinateOrgUnit_ID'
        ],
        ['edmx', 'hierarchy-synthetic.metadata.xml', undefined, 'Xas', 'Xk', 'Xu_Xk'],
        ['edmx', 'hierarchy-synthetic.metadata.xml', undefined, 'Xbs', 'Xj', 'Xp'],
        ['edmx', 'hierarchy-synthetic.metadata.xml', undefined, 'Xcs', 'Xi', 'Xr']
    ] as const)(
        'form a hierarchy without cycles in %s %s %s',
        async (format, file, alias, entitySet, key, reference) => {
            // Given a set whose rows reference a parent row of the same set
            const content = readFileSync(new URL(file, FIXTURES), 'utf8');
            const graph = format === 'csn' ? parseCsn(content, { alias }) : parseEdmx(content);
            const nullable =
                graph.entities
                    .find(({ entitySetName }) => entitySetName === entitySet)
                    ?.properties.find(({ name }) => name === reference)?.nullable === true;
            // When its rows are generated
            const result = await generateServiceForTesting(
                {
                    metadata: { format, content },
                    service: { urlPath: '/hierarchy', odataVersion: '4.0', ...(alias ? { alias } : {}) },
                    targets: graph.entities.map(({ entitySetName }) => ({
                        name: entitySetName,
                        kind: 'entity-set' as const
                    })),
                    existingData: {}
                },
                { seed: 1, rowsPerEntity: 10 }
            );
            const rows = result.resources[entitySet] ?? [];
            const keys = new Set(rows.map((row) => String(row[key])));
            const roots = rows.filter((row) => row[reference] === null || String(row[reference]) === String(row[key]));
            // Then the rows form trees: no parent chain is a cycle, every parent is a row of the set,
            // and the hierarchy has a root, without a parent when the reference may be empty
            expect(rows).toHaveLength(10);
            expect(rowsOnCycles(rows, key, reference)).toEqual([]);
            expect(rows.filter((row) => row[reference] !== null && !keys.has(String(row[reference])))).toEqual([]);
            expect(roots.length).toBeGreaterThan(0);
            expect(roots.every((row) => (nullable ? row[reference] === null : row[reference] !== null))).toBe(true);
            expect(roots.length).toBeLessThan(rows.length);
        }
    );
});
