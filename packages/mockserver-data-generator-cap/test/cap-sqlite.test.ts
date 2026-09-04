import cds from '@sap/cds';
import { seedCapDatabase } from '../src/seed.js';

describe('native CAP SQLite integration', () => {
    test('seeds coherent missing rows once and preserves them on restart', async () => {
        const { generateService } = await import('@sap-ux/mockserver-data-generator');
        const csn = cds.compile.to.csn(`
            namespace demo;
            entity Authors {
                key ID : UUID;
                name : String(80);
            }
            entity Books {
                key ID : UUID;
                title : String(100);
                author : Association to Authors;
            }
        `);
        const database = await cds.connect.to('db', {
            kind: 'sqlite',
            credentials: { url: ':memory:' },
            model: csn
        });
        await cds.deploy(csn).to(database);

        try {
            const first = await seedCapDatabase({
                csn,
                database,
                queryLanguage: cds.ql,
                generate: generateService,
                options: { rowsPerEntity: 3, seed: 42 },
                runtime: {}
            });
            const authors = await database.run(cds.ql.SELECT.from('demo.Authors'));
            const books = await database.run(cds.ql.SELECT.from('demo.Books'));
            const authorIds = new Set(authors.map(({ ID }: { ID: string }) => ID));

            expect(first).toEqual({ inserted: ['demo.Authors', 'demo.Books'], preserved: [] });
            expect(authors).toHaveLength(3);
            expect(books).toHaveLength(3);
            expect(books.every(({ author_ID }: { author_ID: string }) => authorIds.has(author_ID))).toBe(true);

            const second = await seedCapDatabase({
                csn,
                database,
                queryLanguage: cds.ql,
                generate: generateService,
                options: { rowsPerEntity: 3, seed: 42 },
                runtime: {}
            });

            expect(second).toEqual({ inserted: [], preserved: ['demo.Authors', 'demo.Books'] });
            await expect(database.run(cds.ql.SELECT.from('demo.Authors'))).resolves.toHaveLength(3);
            await expect(database.run(cds.ql.SELECT.from('demo.Books'))).resolves.toHaveLength(3);
        } finally {
            await database.disconnect();
        }
    });
});
