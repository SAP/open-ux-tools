import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { generateServiceForTesting } from '../../src/index.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import type { SchemaGraph } from '../../src/schema/graph.js';
import type { MockDataGeneratorResult } from '../../src/types.js';

const require = createRequire(import.meta.url);
const rec20: { codes: string[]; symbols: string[] } = require('../references/unece-rec20-units.json');
const UNITS = new Set([...rec20.codes, ...rec20.symbols].map((unit) => unit.toUpperCase()));

/**
 * Generate every entity set of a fixture deterministically.
 *
 * @param format metadata format
 * @param file fixture path below test/unit
 * @param alias CSN service
 * @returns the parsed graph and the result
 */
async function generated(
    format: 'edmx' | 'csn',
    file: string,
    alias?: string
): Promise<{ graph: SchemaGraph; result: MockDataGeneratorResult }> {
    const content = readFileSync(new URL(file, import.meta.url), 'utf8');
    const service = { urlPath: '/units', odataVersion: '4.0' as const, ...(alias ? { alias } : {}) };
    const graph = parseServiceMetadata({ format, content }, service);
    const result = await generateServiceForTesting(
        {
            metadata: { format, content },
            service,
            targets: [...new Set(graph.entities.map(({ entitySetName }) => entitySetName))].map((name) => ({
                name,
                kind: 'entity-set' as const
            })),
            existingData: {}
        },
        { mode: 'deterministic', rowsPerEntity: 10, seed: 1 }
    );
    return { graph, result };
}

describe('unit fields', () => {
    it.each([
        ['edmx', './fixtures/structural-synthetic.metadata.xml', undefined, 'Kors', 'Khi'],
        ['csn', './fixtures/feature-showcase.csn.json', 'LROPODataService', 'RootEntities', 'uom_code'],
        ['csn', './fixtures/feature-showcase.csn.json', 'LROPODataService', 'UnitOfMeasures', 'code']
    ] as const)(
        'routes the Measures.Unit field %s %s %s.%s to a unit of measure',
        async (format, file, alias, set, field) => {
            // Given a field that a Measures.Unit annotation names, or the key a unit field references
            const { result } = await generated(format, file, alias);
            // Then its role is a unit of measure and every value is a UN/ECE Rec 20 code or symbol
            expect(result.semanticRoles?.[`${set}.${field}`]).toBe('unit_of_measure');
            const values = result.resources[set].map((row) => row[field]);
            expect(values.filter((value) => !UNITS.has(String(value).toUpperCase()))).toEqual([]);
        }
    );

    it('keeps a currency target that a Measures.ISOCurrency annotation names a currency', async () => {
        // Given a CSN amount whose currency path runs through a managed association
        const { graph, result } = await generated('csn', './fixtures/feature-showcase.csn.json', 'LROPODataService');
        const amount = graph.entities
            .find(({ entitySetName }) => entitySetName === 'RootEntities')
            ?.properties.find(({ links }) => links?.currency !== undefined);
        // Then the link names the flattened foreign key, and that field holds currency codes
        expect(amount?.links?.currency).toBeDefined();
        const currencies = new Set(Intl.supportedValuesOf('currency'));
        const values = result.resources.RootEntities.map((row) => row[amount?.links?.currency ?? '']);
        expect(values.filter((value) => !currencies.has(String(value)))).toEqual([]);
    });

    it('gives the unit field of a measured distance a length unit', async () => {
        // Given a measured field whose own role is a distance, named by a meaningless field
        const content = readFileSync(
            new URL('./fixtures/structural-synthetic.metadata.xml', import.meta.url),
            'utf8'
        ).replace(
            '<Property Name="Kgh" Type="Edm.Decimal" Precision="10" Scale="2"/>',
            '<Property Name="Kgh" Type="Edm.Decimal" Precision="10" Scale="2"><Annotation Term="Common.Label" String="Distance"/></Property>'
        );
        const graph = parseServiceMetadata({ format: 'edmx', content }, { urlPath: '/units', odataVersion: '4.0' });
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/units', odataVersion: '4.0' },
                targets: graph.entities.map(({ entitySetName }) => ({
                    name: entitySetName,
                    kind: 'entity-set' as const
                })),
                existingData: {}
            },
            { mode: 'deterministic', rowsPerEntity: 10, seed: 1 }
        );
        // Then its unit field is routed to a length unit
        expect(result.semanticRoles?.['Kors.Khi']).toBe('length_unit');
    });
});
