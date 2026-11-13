import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataRow } from '../../src/types.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { replayObjectPages } from './mockserver-contract.js';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const UNIT = fileURLToPath(new URL('.', import.meta.url));
const DRAFT_COMPOSITION = readFileSync(join(FIXTURES, 'draft-composition.metadata.xml'), 'utf8');
const CONTAINED_CHILDREN = readFileSync(join(FIXTURES, 'contained-children.metadata.xml'), 'utf8');

describe('the mockserver contract harness', () => {
    it('reports the reads a List Report and Object Page app would fail on', async () => {
        // Given rows a mockserver cannot serve: an active row that claims a draft, a draft row, an orphan child
        const resources = {
            Qas: [
                {
                    ID: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d01',
                    IsActiveEntity: true,
                    HasActiveEntity: false,
                    HasDraftEntity: true
                },
                {
                    ID: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d02',
                    IsActiveEntity: false,
                    HasActiveEntity: false,
                    HasDraftEntity: false
                }
            ],
            Qbs: [
                {
                    ID: '1a2b3c4d-1d2a-4b3c-8d4e-5f6a7b8c9d01',
                    IsActiveEntity: true,
                    Qa_ID: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d09'
                }
            ]
        };
        // When the app's reads are replayed
        const replay = await replayObjectPages(DRAFT_COMPOSITION, resources, '4.0');
        // Then each failure is reported in its class
        expect(replay.missingSiblings).toHaveLength(1);
        expect(replay.draftRows).toHaveLength(1);
        expect(replay.emptyChildren.length).toBeGreaterThan(0);
    });

    it('reads contained rows from the row that contains them, at every depth', async () => {
        // Given one row that contains rows at two depths, its to-one row matching its property of the same name as
        // the mockserver matches it, and one row that contains none
        const resources: Record<string, MockDataRow[]> = {
            Zas: [
                {
                    Zk: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d01',
                    Zi: 'C1',
                    Zbn: [
                        { Zj: 1, Zdn: [{ Zh: 'X1' }] },
                        { Zj: 2, Zdn: [{ Zh: 'X1' }] }
                    ],
                    Zcn: [{ Zi: 'C1', Zgn: [{ Zi: 'C1', Zm: 'M1' }] }]
                },
                { Zk: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d02' }
            ]
        };
        // When the app's reads are replayed
        const replay = await replayObjectPages(CONTAINED_CHILDREN, resources, '4.0');
        // Then every contained row of the first row opens, and the second row's containment is reported empty
        expect(replay.unreadable).toEqual([]);
        expect(replay.emptyChildren).toEqual([
            'Zas(Zk=0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d02)/Zbn',
            'Zas(Zk=0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d02)/Zcn'
        ]);
        expect(replay.containedReads).toBe(7);
    });
});

const SERVICES = [
    ['draft-composition', join(FIXTURES, 'draft-composition.metadata.xml'), '4.0', []],
    ['incident-management', join(FIXTURES, 'incident-management.metadata.xml'), '4.0', []],
    ['workplace-admin', join(FIXTURES, 'workplace-admin.metadata.xml'), '4.0', []],
    ['products-review', join(FIXTURES, 'products-review.metadata.xml'), '2.0', []],
    ['travel-v4', join(FIXTURES, 'travel-v4.metadata.xml'), '4.0', []],
    ['travel-v2', join(UNIT, 'travel-v2.metadata.xml'), '2.0', []],
    ['store-overview', join(FIXTURES, 'store-overview.metadata.xml'), '2.0', ['GlobalFilters/ToContacts']],
    ['navigation-fallback', join(FIXTURES, 'navigation-fallback.metadata.xml'), '4.0', []],
    ['association-fallback', join(FIXTURES, 'association-fallback.metadata.xml'), '2.0', []],
    ['reference-precedence', join(FIXTURES, 'reference-precedence.metadata.xml'), '4.0', []],
    ['partial-key-navigation', join(FIXTURES, 'partial-key-navigation.metadata.xml'), '2.0', []],
    ['principal-non-key', join(FIXTURES, 'principal-non-key.metadata.xml'), '2.0', []],
    ['draft-named-child', join(FIXTURES, 'draft-named-child.metadata.xml'), '4.0', []],
    ['contained-children', join(FIXTURES, 'contained-children.metadata.xml'), '4.0', []],
    ['parametrized-results', join(FIXTURES, 'parametrized-results.metadata.xml'), '4.0', []]
] as const;

describe('generated rows on the mockserver', () => {
    it.each(SERVICES)(
        'open a filled object page for every listed row of %s',
        async (_name, path, odataVersion, unmatchable) => {
            // Given the service's generated rows
            const content = readFileSync(path, 'utf8');
            const result = await generateServiceForTesting(
                {
                    metadata: { format: 'edmx', content },
                    service: { urlPath: '/contract', odataVersion },
                    targets: parseEdmx(content)
                        .entities.filter(({ containedBy }) => containedBy === undefined)
                        .map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' as const })),
                    existingData: {}
                },
                { seed: 1, rowsPerEntity: 10 }
            );
            // When the app's reads are replayed on the mockserver
            const replay = await replayObjectPages(content, result.resources, odataVersion);
            // Then no requested set is left without rows
            expect(Object.entries(result.resources).filter(([, rows]) => rows.length === 0)).toEqual([]);
            // And every listed row opens, is active, and claims no draft that does not exist
            expect(replay.listed).toBeGreaterThan(0);
            expect(replay.unreadable).toEqual([]);
            expect(replay.draftRows).toEqual([]);
            expect(replay.missingSiblings).toEqual([]);
            // And every to-many navigation of a listed row shows children, except one whose declared constraint reads
            // a property its source does not declare
            expect(replay.emptyChildren).toEqual([]);
            expect(replay.unmatchable).toEqual(unmatchable);
        },
        30_000
    );
});

/**
 * Generates the rows of every entity set of a service.
 *
 * @param content - The service metadata.
 * @param odataVersion - The OData version.
 * @param seed - The generation seed.
 * @param rowsPerEntity - The rows of each entity set.
 * @param existingRows - Rows already in the mock data folder, by entity set.
 * @returns The generated rows by entity set.
 */
async function generatedRows(
    content: string,
    odataVersion: '2.0' | '4.0',
    seed: number,
    rowsPerEntity: number,
    existingRows: Readonly<Record<string, ReadonlyArray<MockDataRow>>> = {}
): Promise<Record<string, ReadonlyArray<MockDataRow>>> {
    const result = await generateServiceForTesting(
        {
            metadata: { format: 'edmx', content },
            service: { urlPath: '/contract', odataVersion },
            targets: parseEdmx(content)
                .entities.filter(({ containedBy }) => containedBy === undefined)
                .map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' as const })),
            existingData: Object.fromEntries(
                Object.entries(existingRows).map(([name, rows]) => [
                    name,
                    {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows }
                    } as const
                ])
            )
        },
        { seed, rowsPerEntity }
    );
    return result.resources;
}

/** Services of different shapes whose appended rows are replayed: V2, V4 draft, containment, inferred navigation. */
const APPEND_SERVICES = SERVICES.filter(([name]) =>
    ['travel-v2', 'incident-management', 'contained-children', 'navigation-fallback'].includes(name)
);

describe('rows generated next to existing rows on the mockserver', () => {
    it('replays every service chosen for appended rows', () => {
        expect(APPEND_SERVICES).toHaveLength(4);
    });

    it.each(APPEND_SERVICES)(
        'open a filled object page for every listed row of %s',
        async (_name, path, odataVersion, unmatchable) => {
            // Given a mock data folder holding the rows of an earlier run of every entity set
            const content = readFileSync(path, 'utf8');
            const existing = await generatedRows(content, odataVersion, 1, 10);
            // When a run with another seed appends rows to them
            const resources = await generatedRows(content, odataVersion, 7, 10, existing);
            const replay = await replayObjectPages(content, resources, odataVersion);
            // Then every existing row is kept as supplied
            for (const [name, rows] of Object.entries(existing)) {
                expect(resources[name]).toEqual(expect.arrayContaining(rows));
            }
            // And every listed row opens, and every to-many navigation of a listed row shows children
            expect(replay.listed).toBeGreaterThan(0);
            expect(replay.unreadable).toEqual([]);
            expect(replay.missingSiblings).toEqual([]);
            expect(replay.emptyChildren).toEqual([]);
            expect(replay.unmatchable).toEqual(unmatchable);
        },
        30_000
    );
});
