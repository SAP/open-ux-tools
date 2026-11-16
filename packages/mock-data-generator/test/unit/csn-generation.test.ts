import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataServiceRequest, SftGenerator } from '../../src/types.js';

describe('CAP CSN generation', () => {
    it('resolves custom scalar types, enums, and managed-association foreign keys', async () => {
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'csn',
                content: JSON.stringify({
                    definitions: {
                        'demo.Status': {
                            kind: 'type',
                            type: 'cds.String',
                            length: 1,
                            enum: { Open: { val: 'O' }, Closed: { val: 'C' } }
                        },
                        'demo.Author': {
                            kind: 'entity',
                            elements: {
                                ID: { key: true, type: 'cds.UUID', notNull: true },
                                Name: { type: 'cds.String', length: 80 }
                            }
                        },
                        'demo.Book': {
                            kind: 'entity',
                            elements: {
                                ID: { key: true, type: 'cds.UUID', notNull: true },
                                title: { type: 'cds.String', length: 100 },
                                status: { type: 'demo.Status', notNull: true },
                                author: {
                                    type: 'cds.Association',
                                    target: 'demo.Author',
                                    notNull: true,
                                    keys: [{ ref: ['ID'] }]
                                }
                            }
                        }
                    }
                })
            },
            service: { urlPath: '/catalog', odataVersion: '4.0' },
            targets: [
                { name: 'Author', kind: 'entity-set' },
                { name: 'Book', kind: 'entity-set' }
            ],
            existingData: {}
        };

        const result = await generateServiceForTesting(request, { seed: 7, rowsPerEntity: 3 });
        const authorIds = new Set(result.resources.Author.map((row) => row.ID));

        expect(result.resources.Author).toHaveLength(3);
        expect(result.resources.Book).toHaveLength(3);
        expect(result.resources.Book.map((row) => row.status)).toEqual(expect.arrayContaining(['O', 'C']));
        expect(result.resources.Book.every((row) => authorIds.has(row.author_ID))).toBe(true);
    });

    it('never lets SFT output replace deterministic relationship foreign keys', async () => {
        const sft: SftGenerator = {
            fingerprint: 'relationship-hostile-sft',
            generate: jest.fn(async (input) => ({
                rows: Array.from({ length: input.rowCount }, () =>
                    Object.fromEntries(
                        input.fields.map((field) => [
                            field.name,
                            field.primitiveType === 'guid' ? '00000000-0000-4000-8000-000000000000' : 'learned value'
                        ])
                    )
                )
            }))
        };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'csn',
                content: JSON.stringify({
                    definitions: {
                        'demo.Author': {
                            kind: 'entity',
                            elements: {
                                ID: { key: true, type: 'cds.UUID', notNull: true },
                                Name: { type: 'cds.String', length: 80 }
                            }
                        },
                        'demo.Book': {
                            kind: 'entity',
                            elements: {
                                ID: { key: true, type: 'cds.UUID', notNull: true },
                                title: { type: 'cds.String', length: 100 },
                                author: {
                                    type: 'cds.Association',
                                    target: 'demo.Author',
                                    notNull: true,
                                    keys: [{ ref: ['ID'] }]
                                }
                            }
                        }
                    }
                })
            },
            service: { urlPath: '/catalog', odataVersion: '4.0' },
            targets: [
                { name: 'Author', kind: 'entity-set' },
                { name: 'Book', kind: 'entity-set' }
            ],
            existingData: {}
        };

        const result = await generateServiceForTesting(request, { seed: 7, rowsPerEntity: 5 }, { sft });
        const authorIds = new Set(result.resources.Author.map((row) => row.ID));
        const bookRequest = (sft.generate as jest.Mock).mock.calls.find(([input]) => input.entityName === 'Book')?.[0];

        expect(bookRequest.fields.map(({ name }: { name: string }) => name)).not.toContain('author_ID');
        expect(result.resources.Book.every((row) => authorIds.has(row.author_ID))).toBe(true);
    });
});

/**
 * A CSN request for every entity of the definitions.
 *
 * @param definitions the CSN definitions
 * @returns the request
 */
function csnRequest(definitions: Record<string, unknown>): MockDataServiceRequest {
    return {
        metadata: { format: 'csn', content: JSON.stringify({ definitions }) },
        service: { urlPath: '/demo', odataVersion: '4.0' },
        targets: Object.keys(definitions).map((name) => ({ name: name.split('.').at(-1) ?? name, kind: 'entity-set' })),
        existingData: {}
    };
}

describe('foreign keys CAP derives from managed associations', () => {
    it('keeps every requested row of a link entity whose key is two associations', async () => {
        // Given a link entity keyed by its two associations, with no foreign key elements declared
        const request = csnRequest({
            'demo.Books': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } },
            'demo.Authors': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } },
            'demo.Books2Authors': {
                kind: 'entity',
                elements: {
                    book: { key: true, type: 'cds.Association', target: 'demo.Books', keys: [{ ref: ['ID'] }] },
                    author: { key: true, type: 'cds.Association', target: 'demo.Authors', keys: [{ ref: ['ID'] }] },
                    role: { type: 'cds.String', length: 20 }
                }
            }
        });

        // When ten rows of each entity are generated
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 1, rowsPerEntity: 10 });

        // Then the link entity keeps all ten rows, each a distinct pair of book and author
        const links = result.resources.Books2Authors;
        expect(links).toHaveLength(10);
        expect(new Set(links.map((link) => `${String(link.book_ID)}/${String(link.author_ID)}`)).size).toBe(10);
    });

    it('does not write the text of the referenced code into a field of the referencing entity', async () => {
        // Given contacts with a name of their own and a country, whose code names its text element "name" too
        const request = csnRequest({
            'demo.Countries': {
                kind: 'entity',
                elements: {
                    code: { key: true, type: 'cds.String', length: 3, '@Common.Text': { '=': 'name' } },
                    name: { type: 'cds.String', length: 255 }
                }
            },
            'demo.Contacts': {
                kind: 'entity',
                elements: {
                    ID: { key: true, type: 'cds.Integer' },
                    name: { type: 'cds.String', length: 111 },
                    country: { type: 'cds.Association', target: 'demo.Countries', keys: [{ ref: ['code'] }] }
                }
            }
        });

        // When the service is generated
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 1, rowsPerEntity: 6 });

        // Then no contact is named after a country
        const countryNames = new Set(result.resources.Countries.map(({ name }) => name));
        expect(result.resources.Contacts.filter(({ name }) => countryNames.has(name))).toEqual([]);
    });
});
