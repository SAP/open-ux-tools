import { createHash } from 'node:crypto';
import { lstat, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGeneratedDataCache, writeGeneratedDataCache } from '../../src/cache/generated-data.js';
import type { MockDataGeneratorResult } from '../../src/types.js';

const cacheKey = createHash('sha256').update('generated-data-cache-test').digest('hex');

function result(): MockDataGeneratorResult {
    return {
        resources: {
            Products: [
                {
                    ID: 1,
                    Name: 'Notebook'
                }
            ]
        },
        diagnostics: [],
        capabilities: {
            mode: 'hybrid',
            classifier: 'ready',
            sft: 'ready'
        },
        fingerprints: {
            request: cacheKey,
            classifier: 'classifier-v1',
            sft: 'sft-v1'
        },
        statistics: {
            sft: {
                attempts: 1,
                parsedResponses: 1,
                eligibleSlots: 1,
                acceptedSlots: 1,
                assignments: [
                    {
                        resource: 'Products',
                        entity: 'Product',
                        rowCount: 1,
                        parsed: true,
                        fields: [{ name: 'Name', eligibleSlots: 1, acceptedSlots: 1 }]
                    }
                ]
            }
        }
    };
}

function keyFor(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function resultFor(key: string, name: string): MockDataGeneratorResult {
    const value = result();
    return {
        ...value,
        resources: { Products: [{ ID: 1, Name: name }] },
        fingerprints: { ...value.fingerprints, request: key }
    };
}

describe('generated-data cache', () => {
    let cacheRoot: string;

    beforeEach(async () => {
        cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-generated-cache-'));
    });

    afterEach(async () => {
        await rm(cacheRoot, { recursive: true, force: true });
    });

    test('publishes and returns an immutable whole-service result', async () => {
        await writeGeneratedDataCache(cacheRoot, cacheKey, result());

        const cached = await readGeneratedDataCache(cacheRoot, cacheKey);

        expect(cached).toEqual(result());
        expect(Object.isFrozen(cached)).toBe(true);
        expect(Object.isFrozen(cached?.resources.Products?.[0])).toBe(true);
        expect(await readdir(cacheRoot)).toEqual([`${cacheKey}.json`]);
    });

    test('quarantines a corrupt entry and reports a cache miss', async () => {
        await writeFile(join(cacheRoot, `${cacheKey}.json`), '{not-json');

        await expect(readGeneratedDataCache(cacheRoot, cacheKey)).resolves.toBeUndefined();

        expect(await readdir(cacheRoot)).toEqual([
            expect.stringMatching(new RegExp(`^${cacheKey}\\.corrupt-[a-f0-9-]+\\.json$`))
        ]);
    });

    test('evicts the least-recently-used entry within a deterministic byte quota', async () => {
        const firstKey = keyFor('first');
        const secondKey = keyFor('second');
        const thirdKey = keyFor('third');
        await writeGeneratedDataCache(cacheRoot, firstKey, resultFor(firstKey, 'First'));
        await writeGeneratedDataCache(cacheRoot, secondKey, resultFor(secondKey, 'Second'));
        const firstPath = join(cacheRoot, `${firstKey}.json`);
        const secondPath = join(cacheRoot, `${secondKey}.json`);
        const old = new Date('2026-01-01T00:00:00.000Z');
        const recent = new Date('2026-01-02T00:00:00.000Z');
        await utimes(firstPath, old, old);
        await utimes(secondPath, recent, recent);
        const quota = (await lstat(firstPath)).size + (await lstat(secondPath)).size;

        await writeGeneratedDataCache(cacheRoot, thirdKey, resultFor(thirdKey, 'Third'), {
            maximumBytes: quota
        });

        expect(await readGeneratedDataCache(cacheRoot, firstKey)).toBeUndefined();
        expect(await readGeneratedDataCache(cacheRoot, secondKey)).toBeDefined();
        expect(await readGeneratedDataCache(cacheRoot, thirdKey)).toBeDefined();
    });

    test('quarantines an entry rejected by the current schema validator', async () => {
        await writeGeneratedDataCache(cacheRoot, cacheKey, result());

        const cached = await readGeneratedDataCache(cacheRoot, cacheKey, {
            validate: () => {
                throw new TypeError('row no longer matches the current schema');
            }
        });

        expect(cached).toBeUndefined();
        expect(await readdir(cacheRoot)).toEqual([
            expect.stringMatching(new RegExp(`^${cacheKey}\\.corrupt-[a-f0-9-]+\\.json$`))
        ]);
    });

    test('keeps concurrent publication atomic for the same service fingerprint', async () => {
        await Promise.all(Array.from({ length: 8 }, () => writeGeneratedDataCache(cacheRoot, cacheKey, result())));

        await expect(readGeneratedDataCache(cacheRoot, cacheKey)).resolves.toEqual(result());
        expect(await readdir(cacheRoot)).toEqual([`${cacheKey}.json`]);
    });

    test('never treats an interrupted temporary write as a cache hit', async () => {
        const partialPath = join(cacheRoot, `${cacheKey}.json.partial-abandoned`);
        await writeFile(partialPath, JSON.stringify({ resources: { Products: [{ ID: 999 }] } }));

        await expect(readGeneratedDataCache(cacheRoot, cacheKey)).resolves.toBeUndefined();
        await writeGeneratedDataCache(cacheRoot, cacheKey, result());
        await expect(readGeneratedDataCache(cacheRoot, cacheKey)).resolves.toEqual(result());
    });
});
