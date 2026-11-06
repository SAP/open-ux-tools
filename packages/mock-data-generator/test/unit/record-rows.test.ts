import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateServiceForTesting } from '../../src/index.js';
import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import { parseEdmx } from '../../src/schema/edmx.js';

const UNIT = fileURLToPath(new URL('.', import.meta.url));

/**
 * Generate every entity set of an EDMX fixture and return its rows with the record-consistency findings.
 *
 * @param file fixture path below test/unit
 * @param version OData version
 * @returns rows and failing fields
 */
async function generated(file: string, version: '2.0' | '4.0') {
    const content = readFileSync(join(UNIT, file), 'utf8');
    const graph = parseEdmx(content);
    const result = await generateServiceForTesting(
        {
            metadata: { format: 'edmx', content },
            service: { urlPath: '/fixture', odataVersion: version },
            targets: graph.entities.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' as const })),
            existingData: {}
        },
        { seed: 1, rowsPerEntity: 6 }
    );
    const findings = assessRealism({
        graph,
        resources: result.resources,
        checks: new Set([REALISM_CHECK.recordConsistency])
    }).findings.map(({ entitySet, property, examples }) => `${entitySet}.${property} ${examples.join(',')}`);
    return { resources: result.resources, findings };
}

describe('record rows', () => {
    it.each([
        ['travel-v2.metadata.xml', '2.0'],
        ['finance-manage.metadata.xml', '4.0'],
        [join('fixtures', 'store-overview.metadata.xml'), '2.0']
    ] as const)('describe one country or currency per row in %s', async (file, version) => {
        // Given a fixture whose code-list entities key their rows by a country or currency code
        // When it is generated
        const { findings } = await generated(file, version);
        // Then every other code or name column of those rows names the row's own record
        expect(findings).toEqual([]);
    });

    it("gives a country row's other code and name fields the key's country", async () => {
        // Given a retail service whose country value help has a key, a second code and a name
        const { resources } = await generated(join('fixtures', 'store-overview.metadata.xml'), '2.0');
        // Then the second code is the key and the name is the key country's name
        const names = new Intl.DisplayNames('en', { type: 'region' });
        for (const row of resources.VH_CountrySet) {
            expect(row.Landx).toBe(row.CountryCode);
            expect(row.CountryName).toBe(names.of(String(row.CountryCode)));
        }
    });
});
