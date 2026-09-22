import { generateService, type MockDataServiceRequest, type SftGenerator } from '../../src/index.js';

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

        const result = await generateService(request, { seed: 7, rowsPerEntity: 3 });
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

        const result = await generateService(request, { seed: 7, rowsPerEntity: 5 }, { sft });
        const authorIds = new Set(result.resources.Author.map((row) => row.ID));
        const bookRequest = (sft.generate as jest.Mock).mock.calls.find(([input]) => input.entityName === 'Book')?.[0];

        expect(bookRequest.fields.map(({ name }: { name: string }) => name)).not.toContain('author_ID');
        expect(result.resources.Book.every((row) => authorIds.has(row.author_ID))).toBe(true);
    });
});
