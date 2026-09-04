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
                metadata: { format: 'csn', content: JSON.stringify(csn) },
                targets: [
                    { name: 'Author', kind: 'entity-set' },
                    { name: 'Book', kind: 'entity-set' }
                ],
                existingData: expect.objectContaining({
                    Author: expect.objectContaining({
                        initialRows: { source: 'json', present: true, rows: [{ ID: 'author-1' }] }
                    })
                })
            }),
            { rowsPerEntity: 3, seed: 7 },
            {}
        );
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
});
