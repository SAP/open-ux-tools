import { chmod, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { openFileCompletionStore } from '../../src/model/file-completion-store.js';

const key = (index: number): string => index.toString(16).padStart(64, '0');

describe('file-backed answer store', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-answers-'));
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('returns answers stored by an earlier process for the same namespace only', () => {
        const first = openFileCompletionStore({ directory, namespace: 'model-a' });
        first.set(key(1), '{"Remark": "Checked"}');
        first.set(key(2), '{"Remark": "Shipped"}');

        const again = openFileCompletionStore({ directory, namespace: 'model-a' });
        expect(again.get(key(1))).toBe('{"Remark": "Checked"}');
        expect(again.get(key(2))).toBe('{"Remark": "Shipped"}');
        expect(again.failure).toBeUndefined();
        expect(openFileCompletionStore({ directory, namespace: 'model-b' }).get(key(1))).toBeUndefined();
    });

    it('skips malformed lines and ignores malformed keys or oversized answers', async () => {
        const store = openFileCompletionStore({ directory, namespace: 'model-a' });
        store.set(key(1), 'kept');
        store.set('not-a-key', 'ignored');
        store.set(key(2), 'x'.repeat(9_000));
        const [file] = (await import('node:fs')).readdirSync(directory);
        await writeFile(
            join(directory, file ?? ''),
            `${await readFile(join(directory, file ?? ''), 'utf8')}{broken\n[]\n`
        );

        const again = openFileCompletionStore({ directory, namespace: 'model-a' });
        expect(again.get(key(1))).toBe('kept');
        expect(again.get(key(2))).toBeUndefined();
        expect(again.get('not-a-key')).toBeUndefined();
    });

    it('keeps the newest entries and rewrites the file when it grows past its bound', async () => {
        const store = openFileCompletionStore({
            directory,
            namespace: 'model-a',
            maximumEntries: 3,
            maximumBytes: 400
        });
        for (let index = 0; index < 10; index += 1) {
            store.set(key(index), `answer ${index}`);
        }
        const again = openFileCompletionStore({ directory, namespace: 'model-a', maximumEntries: 3 });
        expect(again.get(key(9))).toBe('answer 9');
        expect(again.get(key(0))).toBeUndefined();
        const [file] = (await import('node:fs')).readdirSync(directory);
        expect((await readFile(join(directory, file ?? ''), 'utf8')).length).toBeLessThanOrEqual(400);
    });

    it('resets a file that is already over its bound instead of appending to it', async () => {
        const probe = openFileCompletionStore({ directory, namespace: 'model-a' });
        probe.set(key(1), 'probe');
        const [file] = (await import('node:fs')).readdirSync(directory);
        const target = join(directory, file ?? '');
        const oversized = Array.from({ length: 20 }, (_, index) => JSON.stringify({ k: key(index), v: 'old' }))
            .join('\n')
            .concat('\n');
        await writeFile(target, oversized);
        expect(oversized.length).toBeGreaterThan(400);

        const store = openFileCompletionStore({ directory, namespace: 'model-a', maximumBytes: 400 });
        expect(store.failure).toBeUndefined();
        expect(store.get(key(1))).toBeUndefined();
        store.set(key(30), 'fresh');

        expect((await stat(target)).size).toBeLessThanOrEqual(400);
        expect(openFileCompletionStore({ directory, namespace: 'model-a', maximumBytes: 400 }).get(key(30))).toBe(
            'fresh'
        );
    });

    it('stays within its byte bound and rewrites rarely when the entry bound is far away', async () => {
        const maximumBytes = 2_000;
        const store = openFileCompletionStore({ directory, namespace: 'model-a', maximumBytes });
        store.set(key(0), 'answer 0');
        const [file] = (await import('node:fs')).readdirSync(directory);
        const target = join(directory, file ?? '');
        let inode = (await stat(target)).ino;
        let rewrites = 0;
        for (let index = 1; index <= 1_000; index += 1) {
            store.set(key(index), `answer ${index} ${'x'.repeat(40)}`);
            const current = await stat(target);
            expect(current.size).toBeLessThanOrEqual(maximumBytes);
            if (current.ino !== inode) {
                rewrites += 1;
                inode = current.ino;
            }
        }

        // Each line is about 130 bytes, so 1,000 answers append about 130 KB: a rewrite on every answer
        // past the bound would be close to 1,000 rewrites, a rewrite down to half the bound fewer than 200.
        expect(rewrites).toBeGreaterThan(0);
        expect(rewrites).toBeLessThan(200);
        expect(store.failure).toBeUndefined();
        expect(openFileCompletionStore({ directory, namespace: 'model-a', maximumBytes }).get(key(1_000))).toBe(
            `answer 1000 ${'x'.repeat(40)}`
        );
    });

    it('refuses a symbolic link and a relative directory but still answers from memory', async () => {
        const target = join(directory, 'elsewhere.jsonl');
        await writeFile(target, '');
        const probe = openFileCompletionStore({ directory, namespace: 'model-a' });
        probe.set(key(1), 'x');
        const [file] = (await import('node:fs')).readdirSync(directory).filter((name) => name.startsWith('answers-'));
        await rm(join(directory, file ?? ''));
        await symlink(target, join(directory, file ?? ''));

        const linked = openFileCompletionStore({ directory, namespace: 'model-a' });
        expect(linked.failure).toMatch(/regular file/u);
        linked.set(key(2), 'memory only');
        expect(linked.get(key(2))).toBe('memory only');
        expect(await readFile(target, 'utf8')).toBe('');

        const relative = openFileCompletionStore({ directory: 'relative/dir', namespace: 'model-a' });
        expect(relative.failure).toMatch(/absolute/u);
    });

    it('records a write failure and keeps working in memory', async () => {
        const store = openFileCompletionStore({ directory, namespace: 'model-a' });
        store.set(key(1), 'first');
        await chmod(directory, 0o500);
        try {
            const blocked = openFileCompletionStore({ directory, namespace: 'model-b' });
            blocked.set(key(2), 'second');
            expect(blocked.get(key(2))).toBe('second');
            expect(blocked.failure).toBeDefined();
        } finally {
            await chmod(directory, 0o700);
        }
    });
});

describe('answer cache option', () => {
    it('requires an absolute directory', async () => {
        const { createMockDataGenerator } = await import('../../src/standalone.js');
        await expect(createMockDataGenerator({ answerCacheDirectory: 'relative/cache' })).rejects.toThrow('absolute');
    });
});
