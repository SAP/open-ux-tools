import { readFileSync } from 'node:fs';
import { parseCsn } from '../../src/schema/csn.js';

// Compiled with `cds.compile.for.odata` from a bookshop model with a CatalogService (Books, Authors)
// and an AdminService (Books only, so its author association still points at the db entity).
const BOOKSHOP = readFileSync(new URL('./fixtures/bookshop.csn.json', import.meta.url), 'utf8');

function withoutAdminService(): string {
    const csn = JSON.parse(BOOKSHOP) as { definitions: Record<string, unknown> };
    for (const name of Object.keys(csn.definitions)) {
        if (name.startsWith('sap.capire.bookshop.AdminService')) {
            delete csn.definitions[name];
        }
    }
    return JSON.stringify(csn);
}

function withPath(path: string): string {
    const csn = JSON.parse(BOOKSHOP) as { definitions: Record<string, Record<string, unknown>> };
    csn.definitions['sap.capire.bookshop.AdminService']['@path'] = path;
    return JSON.stringify(csn);
}

function entitySetNames(content: string, selection?: Parameters<typeof parseCsn>[1]): string[] {
    return parseCsn(content, selection).entities.map(({ entitySetName }) => entitySetName);
}

describe('CAP CSN service entity set naming', () => {
    it('names entity sets after the service-local name when one service exists', () => {
        // Given a compiled model with a single service in a deep namespace
        const content = withoutAdminService();
        // When it is parsed
        const names = entitySetNames(content);
        // Then the entity sets carry CAP's OData names, not namespace-flattened ones
        expect(names).toEqual(['Authors', 'Authors_texts', 'Books', 'Books_texts']);
        // And every name is accepted as a project data target (the generateProjectData name rule)
        expect(names.every((name) => /^[A-Za-z_][A-Za-z0-9_-]*$/u.test(name))).toBe(true);
    });

    it('links projections through the service-level association targets', () => {
        // Given the single-service model
        // When it is parsed
        const graph = parseCsn(withoutAdminService());
        // Then Books.author links to the service's Authors set by author_ID
        expect(graph.relationships).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'author',
                    fromEntitySet: 'Books',
                    toEntitySet: 'Authors',
                    mappings: [{ sourceProperty: 'author_ID', targetProperty: 'ID' }]
                })
            ])
        );
    });

    it('asks for a service alias when several services are defined', () => {
        // Given a compiled model with two services and no selection
        // When it is parsed
        // Then the error lists the services and how to choose one
        expect(() => parseCsn(BOOKSHOP)).toThrow(
            /defines several services \(sap\.capire\.bookshop\.AdminService, sap\.capire\.bookshop\.CatalogService\).*service\.alias/
        );
    });

    it.each([['AdminService'], ['sap.capire.bookshop.AdminService']])(
        'selects the service named by the alias %s',
        (alias) => {
            // Given two services and an alias naming one of them
            // When it is parsed
            const graph = parseCsn(BOOKSHOP, { alias });
            // Then only that service's entity sets are produced
            expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(['Books', 'Books_texts']);
            // And the association to the unexposed db entity keeps its foreign key without a navigation
            const books = graph.entities.find(({ entitySetName }) => entitySetName === 'Books');
            expect(books?.properties.map(({ name }) => name)).toContain('author_ID');
            expect(
                graph.relationships.some(({ name, fromEntitySet }) => name === 'author' && fromEntitySet === 'Books')
            ).toBe(false);
        }
    );

    it.each([
        ['/odata/v4/admin/', undefined],
        ['/odata/v4/admin-api/', '/admin-api'],
        ['/browse', 'browse']
    ])('selects the service whose path matches the URL %s', (urlPath, path) => {
        // Given two services, optionally with an explicit @path on the admin service
        const content = path === undefined ? BOOKSHOP : withPath(path);
        // When the request URL path matches the admin service path
        const names = entitySetNames(content, { urlPath });
        // Then the admin service is chosen
        expect(names).toEqual(['Books', 'Books_texts']);
    });

    it('rejects an alias that names no service', () => {
        // Given two services and an alias that matches neither
        // When it is parsed
        // Then the error names the alias and the available services
        expect(() => parseCsn(BOOKSHOP, { alias: 'OrdersService' })).toThrow(/OrdersService.*AdminService/);
    });

    it('rejects two definitions that resolve to the same entity set name', () => {
        // Given a db-only model whose local names collide
        const content = JSON.stringify({
            definitions: {
                'db.Authors': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } },
                'S.Authors': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } }
            }
        });
        // When it is parsed
        // Then it fails naming both definitions instead of emitting dotted entity set names
        expect(() => parseCsn(content)).toThrow(/db\.Authors.*S\.Authors.*Authors/);
    });

    it('keeps the namespace-stripping rule for models without services', () => {
        // Given a db-only model with two-segment names
        const content = JSON.stringify({
            definitions: { 'demo.Book': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } } }
        });
        // When it is parsed
        // Then the first segment is dropped as before
        expect(entitySetNames(content)).toEqual(['Book']);
    });
});
