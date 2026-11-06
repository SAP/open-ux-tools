import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateServiceForTesting } from '../../src/index.js';
import { alignReferencedValues } from '../../src/generation/referenced-values.js';
import { valueListedProperties } from '../../src/generation/tuple-domain.js';
import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { SchemaGraph } from '../../src/schema/graph.js';
import type { SftGenerator } from '../../src/types.js';

const UNIT = fileURLToPath(new URL('.', import.meta.url));

/** The fixture services of four domains plus one with meaningless names, as request inputs and graphs. */
const FIXTURES = [
    { file: 'finance-manage.metadata.xml', version: '4.0' },
    { file: 'travel-v2.metadata.xml', version: '2.0' },
    { file: join('fixtures', 'store-overview.metadata.xml'), version: '2.0' },
    { file: join('fixtures', 'structural-synthetic.metadata.xml'), version: '4.0' }
] as const;

/**
 * A request for every entity set of an EDMX fixture.
 *
 * @param file fixture path below test/unit
 * @param version OData version
 * @returns the request and the parsed graph
 */
function edmxRequest(file: string, version: '2.0' | '4.0') {
    const content = readFileSync(join(UNIT, file), 'utf8');
    const graph = parseEdmx(content);
    return {
        graph,
        request: {
            metadata: { format: 'edmx' as const, content },
            service: { urlPath: '/fixture', odataVersion: version },
            targets: graph.entities.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' as const })),
            existingData: {}
        }
    };
}

/**
 * The reference-text outcome of generated rows.
 *
 * @param graph service schema
 * @param resources generated rows
 * @returns failing fields and examined fields
 */
function referenceTexts(graph: SchemaGraph, resources: Parameters<typeof assessRealism>[0]['resources']) {
    const assessment = assessRealism({ graph, resources, checks: new Set([REALISM_CHECK.referenceText]) });
    return {
        failing: assessment.findings.map(
            ({ entitySet, property, examples }) => `${entitySet}.${property} ${examples[0]}`
        ),
        examined: assessment.coverage[REALISM_CHECK.referenceText].fields
    };
}

describe('texts next to references', () => {
    it.each(FIXTURES)('are the texts of the referenced rows in $file', async ({ file, version }) => {
        // Given a fixture service generated in full
        const { graph, request } = edmxRequest(file, version);

        // When its rows are generated
        const result = await generateServiceForTesting(request, { seed: 1, rowsPerEntity: 6 });

        // Then every text next to a reference is the text of the row it references
        expect(referenceTexts(graph, result.resources).failing).toEqual([]);
    });

    it('covers references in the services that declare texts on both ends', async () => {
        // Given the fixtures whose relationships map a field with a text to a field with a text
        const examined = await Promise.all(
            FIXTURES.map(async ({ file, version }) => {
                const { graph, request } = edmxRequest(file, version);
                const result = await generateServiceForTesting(request, { seed: 1, rowsPerEntity: 6 });
                return referenceTexts(graph, result.resources).examined;
            })
        );
        // When counted, Then the check examined fields in the finance and the meaningless-name service
        expect(examined[0]).toBeGreaterThan(0);
        expect(examined[3]).toBeGreaterThan(0);
    });

    it('keeps the referenced row text a model wrote and does not ask the model for the referencing text', async () => {
        // Given a model that writes a distinct text for every field it is asked for
        const { graph, request } = edmxRequest(join('fixtures', 'structural-synthetic.metadata.xml'), '4.0');
        const asked: string[] = [];
        const sft: SftGenerator = {
            fingerprint: 'every-field',
            generate: async (input) => {
                asked.push(...input.fields.map(({ name }) => `${input.entityName}.${name}`));
                return {
                    rows: Array.from({ length: input.rowCount }, (_unused, row) =>
                        Object.fromEntries(input.fields.map(({ name }) => [name, `${name} words ${row}`]))
                    )
                };
            }
        };

        // When the service is generated with the model
        const result = await generateServiceForTesting(
            request,
            { seed: 1, rowsPerEntity: 4 },
            { sft, candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) } }
        );

        // Then the referencing text is copied from the referenced row, and the model was not asked for it
        expect(referenceTexts(graph, result.resources).failing).toEqual([]);
        expect(asked).not.toContain('Kor.Kdo');
        const lomen = new Map(result.resources.Lomen.map((row) => [row.Kci, row.Lna]));
        for (const row of result.resources.Kors) {
            expect(row.Kdo).toBe(lomen.get(row.Kci));
        }
    });

    it('does not write texts of rows the caller supplied', async () => {
        // Given a supplied referencing row whose text differs from the referenced row
        const { request } = edmxRequest(join('fixtures', 'structural-synthetic.metadata.xml'), '4.0');
        const supplied = (rows: Array<Record<string, string>>) => ({
            contributor: { present: false } as const,
            initialRows: { source: 'json' as const, present: true as const, rows }
        });
        const existingData = {
            Kors: supplied([{ Kua: '6f1f8b0e-0000-4000-8000-000000000001', Kbe: 'A1', Kci: 'X1', Kdo: 'Own text' }]),
            Lomen: supplied([{ Kci: 'X1', Lna: 'Other text' }])
        };

        // When the service is generated around them
        const result = await generateServiceForTesting({ ...request, existingData }, { seed: 1, rowsPerEntity: 3 });

        // Then the supplied text is published as written
        expect(result.resources.Kors.find((row) => row.Kci === 'X1')?.Kdo).toBe('Own text');
    });
});

describe('semantic keys repeated beside a reference', () => {
    it.each(FIXTURES)('are the values of the referenced rows in $file', async ({ file, version }) => {
        // Given a fixture service generated in full
        const { graph, request } = edmxRequest(file, version);

        // When its rows are generated
        const result = await generateServiceForTesting(request, { seed: 1, rowsPerEntity: 6 });

        // Then every repeated semantic key is the referenced row's, and no two rows share a semantic key
        const assessment = assessRealism({
            graph,
            resources: result.resources,
            checks: new Set([REALISM_CHECK.referenceCopy, REALISM_CHECK.semanticKeyUnique])
        });
        expect(
            assessment.findings.map(({ check, entitySet, property }) => `${check} ${entitySet}.${property}`)
        ).toEqual([]);
    });

    it('copies the referenced row value into a child that repeats it', async () => {
        // Given a child entity repeating its parent's semantic key beside the technical reference
        const { request } = edmxRequest(join('fixtures', 'structural-synthetic.metadata.xml'), '4.0');

        // When the service is generated
        const result = await generateServiceForTesting(request, { seed: 1, rowsPerEntity: 5 });

        // Then each child carries the semantic key of the parent row it references
        const parents = new Map(result.resources.Kors.map((row) => [row.Kua, row.Kbe]));
        expect(result.resources.Mups.length).toBeGreaterThan(0);
        for (const row of result.resources.Mups) {
            expect(row.Kbe).toBe(parents.get(row.Kua));
        }
    });
});

describe('semantic keys in a facet form', () => {
    it('keeps a child equal to its parent when the model writes letters into a digit-sequence semantic key', async () => {
        // Given a parent semantic key and its repetition in a child, both digit sequences, and a model that
        // writes letters into the parent's key
        const digits = (name: string, nullable: string): string =>
            `<Property Name="Kbe" Type="Edm.String" MaxLength="10"${nullable}><Annotation Term="Common.IsDigitSequence"/></Property>`.replace(
                'Kbe',
                name
            );
        const content = readFileSync(join(UNIT, 'fixtures', 'structural-synthetic.metadata.xml'), 'utf8')
            .replace(
                '<Property Name="Kbe" Type="Edm.String" MaxLength="10" Nullable="false"/>',
                digits('Kbe', ' Nullable="false"')
            )
            .replace('<Property Name="Kbe" Type="Edm.String" MaxLength="10"/>', digits('Kbe', ''));
        const graph = parseEdmx(content);
        const sft: SftGenerator = {
            fingerprint: 'letters-in-digits',
            generate: async (input) => ({
                rows: Array.from({ length: input.rowCount }, (_unused, row) =>
                    Object.fromEntries(
                        input.fields.map(({ name }) => [name, name === 'Kbe' ? `QX-0${row}` : `${name} ${row}`])
                    )
                )
            })
        };
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/facet-keys', odataVersion: '4.0' },
                targets: graph.entities.map(({ entitySetName }) => ({
                    name: entitySetName,
                    kind: 'entity-set' as const
                })),
                existingData: {}
            },
            { seed: 1, rowsPerEntity: 5 },
            { sft, candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) } }
        );

        // Then each child repeats its parent's key, and both hold digits only
        const parents = new Map(result.resources.Kors.map((row) => [row.Kua, row.Kbe]));
        for (const row of result.resources.Mups) {
            expect(row.Kbe).toBe(parents.get(row.Kua));
        }
        expect([...parents.values()].every((value) => /^\d+$/u.test(String(value)))).toBe(true);
    });
});

// The CSN fixture has no text annotations; it is generated to show the pass leaves such services alone.
describe('texts next to references in a CSN service', () => {
    it('changes nothing when no text is declared', async () => {
        const csn = readFileSync(join(UNIT, 'fixtures', 'bookshop.csn.json'), 'utf8');
        const graph = parseCsn(csn, { alias: 'AdminService' });
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'csn', content: csn },
                service: { urlPath: '/admin', odataVersion: '4.0', alias: 'AdminService' },
                targets: graph.entities.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' })),
                existingData: {}
            },
            { seed: 1, rowsPerEntity: 3 }
        );
        expect(referenceTexts(graph, result.resources)).toEqual({ failing: [], examined: 0 });
    });
});

describe('texts of a code that reaches two code lists', () => {
    it('keeps the value-list text and gives it to the referenced row', async () => {
        // Given a code field whose text a value list pairs with its code, and a navigation to another code list
        const { graph, request } = edmxRequest(join('fixtures', 'reference-and-value-list.metadata.xml'), '4.0');

        // When its rows are generated
        const result = await generateServiceForTesting(request, { seed: 1, rowsPerEntity: 6 });

        // Then each owner row holds the text of its value-list row, and the referenced row has that text too
        const { Owas, Rods, Vafs } = result.resources;
        const textOf = (rows: typeof Owas, text: string) => new Map(rows.map((row) => [row.Pkb, row[text]]));
        const listed = textOf(Vafs, 'Vng');
        const referenced = textOf(Rods, 'Rne');
        expect(Owas.filter((row) => row.Otc !== listed.get(row.Pkb))).toEqual([]);
        expect(Owas.filter((row) => referenced.has(row.Pkb) && row.Otc !== referenced.get(row.Pkb))).toEqual([]);
        expect(referenceTexts(graph, result.resources).failing).toEqual([]);
    });
});

describe('texts of a value list in a facet form', () => {
    const upperCase = (target: string) =>
        `<Annotations Target="SAP__self.${target}"><Annotation Term="Common.IsUpperCase"/></Annotations>`;
    it.each([
        ['the owner text', 'Owa/Otc'],
        ['the value-help text', 'Vaf/Vng']
    ])('keeps every row a member of its value-list tuple when %s is upper case', async (_side, target) => {
        // Given a code whose text a value list pairs with it, where one side of the pair is upper case
        const { request } = edmxRequest(join('fixtures', 'reference-and-value-list.metadata.xml'), '4.0');
        const content = request.metadata.content.replace('</Schema>', `${upperCase(target)}</Schema>`);

        // When its rows are generated
        const result = await generateServiceForTesting(
            { ...request, metadata: { format: 'edmx', content } },
            { seed: 1, rowsPerEntity: 6 }
        );

        // Then each owner text is its value-help text in upper case
        const { Owas, Vafs } = result.resources;
        const listed = new Map(Vafs.map((row) => [row.Pkb, String(row.Vng).toUpperCase()]));
        expect(Owas.filter((row) => row.Otc !== listed.get(row.Pkb))).toEqual([]);
    });
});

describe('aligning values on both sides of a value list', () => {
    it('never rewrites a column a value list reads, on either side of a reference', () => {
        // Given an owner text and the referenced row's text that value lists both decide
        const { graph } = edmxRequest(join('fixtures', 'reference-and-value-list.metadata.xml'), '4.0');
        const resources = {
            Owas: [{ Oka: '00000000-0000-0000-0000-000000000001', Pkb: 'A1', Otc: 'OWNER TEXT' }],
            Rods: [{ Pkb: 'A1', Rne: 'Referenced text' }],
            Vafs: [{ Pkb: 'A1', Vng: 'Owner text' }]
        };
        const listedProperties = new Map([
            ['Owas', new Set(['Pkb', 'Otc'])],
            ['Rods', new Set(['Rne'])]
        ]);

        // When references are aligned in either pass
        const results = [true, false].map(
            (fillReferenced) =>
                alignReferencedValues({ graph, resources, existingData: {}, listedProperties, fillReferenced })
                    .resources
        );

        // Then neither text changes
        expect(results).toEqual([resources, resources]);
    });
});

describe('the properties a value list decides', () => {
    it('are the owner fields and the value-help columns they pair with', async () => {
        // Given a code whose text a value list pairs with a value-help row, generated in full
        const { graph, request } = edmxRequest(join('fixtures', 'reference-and-value-list.metadata.xml'), '4.0');
        const result = await generateServiceForTesting(request, { seed: 1, rowsPerEntity: 3 });

        // When the listed properties are read
        const listed = valueListedProperties(graph, result.resources, {});

        // Then both sides of the list are listed, and the referenced entity is not
        expect([...listed].map(([entitySet, names]) => [entitySet, [...names].sort()])).toEqual([
            ['Owas', ['Otc', 'Pkb']],
            ['Vafs', ['Pkb', 'Vng']]
        ]);
    });
});
