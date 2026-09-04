import type { MockDataGeneratorRuntime, MockDataGeneratorOptions } from '@sap-ux/mockserver-data-generator';
import { seedCapDatabase } from '../src/seed.js';

const csn = {
    definitions: {
        'demo.Author': {
            kind: 'entity',
            elements: {
                ID: { key: true, type: 'cds.UUID', notNull: true },
                Name: { type: 'cds.String' }
            }
        },
        'demo.Book': {
            kind: 'entity',
            elements: {
                ID: { key: true, type: 'cds.UUID', notNull: true },
                title: { type: 'cds.String' },
                author: {
                    type: 'cds.Association',
                    target: 'demo.Author',
                    keys: [{ ref: ['ID'] }]
                }
            }
        },
        'CatalogService.Books': {
            kind: 'entity',
            query: { SELECT: { from: { ref: ['demo.Book'] } } },
            elements: { ID: { key: true, type: 'cds.UUID' } }
        },
        'demo.External': {
            kind: 'entity',
            '@cds.persistence.skip': true,
            elements: { ID: { key: true, type: 'cds.UUID' } }
        }
    }
};

function queryLanguage() {
    return {
        SELECT: {
            from: (entity: string) => ({
                kind: 'select',
                entity,
                selected: [] as string[],
                columns(...columns: string[]) {
                    this.selected = columns;
                    return this;
                },
                limit(rows: number) {
                    return { ...this, rows };
                }
            })
        },
        INSERT: {
            into: (entity: string) => ({
                entries: (rows: ReadonlyArray<Record<string, unknown>>) => ({ kind: 'insert', entity, rows })
            })
        }
    };
}

describe('native CAP database seeding', () => {
    test('preserves populated entities and inserts only missing persistence entities', async () => {
        const operations: Array<Record<string, unknown>> = [];
        const tx = {
            run: jest.fn(async (query: Record<string, unknown>) => {
                operations.push(query);
                if (query.kind === 'select' && query.entity === 'demo.Author') {
                    return [{ ID: 'author-1' }];
                }
                return [];
            })
        };
        const database = { tx: jest.fn(async (handler: (transaction: typeof tx) => Promise<void>) => handler(tx)) };
        const generate = jest.fn(
            async (
                request: Record<string, unknown>,
                _options: MockDataGeneratorOptions,
                _runtime: MockDataGeneratorRuntime
            ) => ({
                resources: {
                    Author: [{ ID: 'author-1' }],
                    Book: [{ ID: 'book-1', title: 'Treasury Operations', author_ID: 'author-1' }]
                },
                diagnostics: [],
                capabilities: { mode: 'deterministic', classifier: 'unavailable', sft: 'unavailable' },
                fingerprints: { request: 'request' },
                request
            })
        );

        const result = await seedCapDatabase({
            csn,
            database,
            queryLanguage: queryLanguage(),
            generate,
            options: { rowsPerEntity: 3, seed: 7 },
            runtime: {}
        });

        expect(result).toEqual({ inserted: ['demo.Book'], preserved: ['demo.Author'] });
        expect(generate).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: { format: 'csn', content: expect.any(String) },
                targets: [{ name: 'Book', kind: 'entity-set' }],
                existingData: expect.objectContaining({
                    Author: expect.objectContaining({
                        initialRows: { source: 'json', present: true, rows: [{ ID: 'author-1' }] }
                    })
                })
            }),
            { rowsPerEntity: 3, seed: 7 },
            {}
        );
        const generationCsn = JSON.parse(
            (generate.mock.calls[0]?.[0] as { metadata: { content: string } }).metadata.content
        ) as { definitions: Record<string, unknown> };
        expect(Object.keys(generationCsn.definitions)).toEqual(['demo.Author', 'demo.Book']);
        expect(operations.filter(({ kind }) => kind === 'insert')).toEqual([
            {
                kind: 'insert',
                entity: 'demo.Book',
                rows: [{ ID: 'book-1', title: 'Treasury Operations', author_ID: 'author-1' }]
            }
        ]);
    });

    test('inserts all missing entities in foreign-key order inside one transaction', async () => {
        const inserted: string[] = [];
        const tx = {
            run: jest.fn(async (query: Record<string, unknown>) => {
                if (query.kind === 'insert') {
                    inserted.push(String(query.entity));
                }
                return [];
            })
        };
        const database = { tx: jest.fn(async (handler: (transaction: typeof tx) => Promise<void>) => handler(tx)) };

        await seedCapDatabase({
            csn,
            database,
            queryLanguage: queryLanguage(),
            generate: jest.fn(async () => ({
                resources: { Author: [{ ID: 'author-1' }], Book: [{ ID: 'book-1', author_ID: 'author-1' }] },
                diagnostics: [],
                capabilities: { mode: 'deterministic', classifier: 'unavailable', sft: 'unavailable' },
                fingerprints: { request: 'request' }
            })),
            options: {},
            runtime: {}
        });

        expect(database.tx).toHaveBeenCalledTimes(1);
        expect(inserted).toEqual(['demo.Author', 'demo.Book']);
    });

    test('does not invoke generation when every persistence entity already contains data', async () => {
        const transaction = {
            run: jest.fn(async (query: Record<string, unknown>) => {
                if (query.kind === 'select') {
                    return [{ ID: `${String(query.entity)}-1` }];
                }
                return undefined;
            })
        };
        const database = {
            tx: jest.fn(async (handler: (tx: typeof transaction) => Promise<void>) => handler(transaction))
        };
        const generate = jest.fn();

        const result = await seedCapDatabase({
            csn,
            database,
            queryLanguage: queryLanguage(),
            generate,
            options: {},
            runtime: {}
        });

        expect(result).toEqual({ inserted: [], preserved: ['demo.Author', 'demo.Book'] });
        expect(generate).not.toHaveBeenCalled();
        expect(transaction.run).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'insert' }));
    });

    test('seeds a persistence entity when a service projection has the same local name', async () => {
        const { generateService } = await import('@sap-ux/mockserver-data-generator');
        const collisionCsn = {
            definitions: {
                'demo.Book': {
                    kind: 'entity',
                    elements: {
                        ID: { key: true, type: 'cds.UUID', notNull: true },
                        title: { type: 'cds.String', length: 80 }
                    }
                },
                'CatalogService.Book': {
                    kind: 'entity',
                    query: { SELECT: { from: { ref: ['demo.Book'] } } },
                    elements: {
                        ID: { key: true, type: 'cds.UUID', notNull: true },
                        title: { type: 'cds.String', length: 80 }
                    }
                }
            }
        };
        const inserted: Array<Record<string, unknown>> = [];
        const tx = {
            run: jest.fn(async (query: Record<string, unknown>) => {
                if (query.kind === 'insert') {
                    inserted.push(query);
                }
                return [];
            })
        };
        const database = { tx: jest.fn(async (handler: (transaction: typeof tx) => Promise<void>) => handler(tx)) };

        const result = await seedCapDatabase({
            csn: collisionCsn,
            database,
            queryLanguage: queryLanguage(),
            generate: generateService,
            options: { rowsPerEntity: 1, seed: 17 },
            runtime: {}
        });

        expect(result).toEqual({ inserted: ['demo.Book'], preserved: [] });
        expect(inserted).toEqual([
            expect.objectContaining({
                kind: 'insert',
                entity: 'demo.Book',
                rows: [expect.objectContaining({ ID: expect.any(String), title: expect.any(String) })]
            })
        ]);
    });
});
