import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
    readFile,
    readJSON,
    fileExists,
    writeFile,
    updateFile,
    updateJSON,
    deleteFile,
    initI18n
} from '../../../src/index.js';
import { createMemFsEditor } from '../../../src/utils/fs-adapter.js';

const commit = (fs: ReturnType<typeof createMemFsEditor>): Promise<void> =>
    new Promise<void>((resolve, reject) => fs.commit((err) => (err ? reject(err) : resolve())));

describe('File Access Utilities', () => {
    const testRoot = join(tmpdir(), 'file-access-test-' + Date.now());

    beforeAll(async () => {
        await initI18n();
        mkdirSync(testRoot, { recursive: true });
    });

    afterAll(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    describe('fileExists', () => {
        test('should return true for a staged file', () => {
            const testFile = join(testRoot, 'staged.txt');
            const fs = createMemFsEditor();
            fs.write(testFile, 'staged');

            expect(fileExists(fs, testFile)).toBe(true);
        });

        test('should fall back to disk for an unstaged file', () => {
            const testFile = join(testRoot, 'on-disk.txt');
            writeFileSync(testFile, 'on disk');

            const fs = createMemFsEditor();
            expect(fileExists(fs, testFile)).toBe(true);
        });

        test('should return false when neither staged nor on disk', () => {
            const testFile = join(testRoot, 'missing.txt');

            const fs = createMemFsEditor();
            expect(fileExists(fs, testFile)).toBe(false);
        });
    });

    describe('readFile', () => {
        test('should read file content from disk', () => {
            const testFile = join(testRoot, 'read.txt');
            writeFileSync(testFile, 'test content');

            const fs = createMemFsEditor();
            expect(readFile(fs, testFile)).toBe('test content');
        });

        test('should read staged file content', () => {
            const testFile = join(testRoot, 'read-staged.txt');
            const fs = createMemFsEditor();
            fs.write(testFile, 'editor content');

            expect(readFile(fs, testFile)).toBe('editor content');
        });
    });

    describe('writeFile', () => {
        test('should write file content', async () => {
            const testFile = join(testRoot, 'write.txt');
            const fs = createMemFsEditor();

            writeFile(fs, testFile, 'new content');
            await commit(fs);

            expect(readFileSync(testFile, 'utf-8')).toBe('new content');
        });
    });

    describe('readJSON', () => {
        test('should read and parse JSON file from disk', async () => {
            const testFile = join(testRoot, 'test.json');
            const data = { foo: 'bar', number: 42 };
            writeFileSync(testFile, JSON.stringify(data));

            const fs = createMemFsEditor();
            expect(await readJSON(fs, testFile)).toEqual(data);
        });

        test('should read staged JSON content', async () => {
            const testFile = join(testRoot, 'context.json');
            const data = { staged: true };
            const fs = createMemFsEditor();
            fs.write(testFile, JSON.stringify(data));

            expect(await readJSON<typeof data>(fs, testFile)).toEqual(data);
        });
    });

    describe('updateJSON', () => {
        test('should update JSON file preserving formatting', async () => {
            const testFile = join(testRoot, 'update.json');
            writeFileSync(testFile, JSON.stringify({ foo: 'bar', nested: { value: 1 } }, null, 2));

            const fs = createMemFsEditor();
            updateJSON(fs, testFile, { foo: 'updated', nested: { value: 2 }, newField: 'added' });
            await commit(fs);

            const result = await readJSON(fs, testFile);
            expect(result.foo).toBe('updated');
            expect(result.nested.value).toBe(2);
            expect(result.newField).toBe('added');
        });

        test('should write a new JSON file with default indentation when none exists', async () => {
            const testFile = join(testRoot, 'new.json');

            const fs = createMemFsEditor();
            // File does not exist yet, so updateJSON falls into the catch branch
            // and writes with default 4-space indentation.
            updateJSON(fs, testFile, { created: true });
            await commit(fs);

            expect(readFileSync(testFile, 'utf-8')).toBe('{\n    "created": true\n}\n');
        });
    });

    describe('updateFile', () => {
        test('should update text file content', async () => {
            const testFile = join(testRoot, 'update.txt');
            writeFileSync(testFile, 'original content');

            const fs = createMemFsEditor();
            updateFile(fs, testFile, 'modified content');
            await commit(fs);

            expect(readFile(fs, testFile)).toBe('modified content');
        });
    });

    describe('deleteFile', () => {
        test('should delete a file', async () => {
            const testFile = join(testRoot, 'to-delete.txt');
            writeFileSync(testFile, 'delete me');

            const fs = createMemFsEditor();
            deleteFile(fs, testFile);
            await commit(fs);

            expect(fileExists(fs, testFile)).toBe(false);
        });
    });

    describe('mem-fs directory handling', () => {
        test('should create directory implicitly when writing file', async () => {
            const nestedDir = join(testRoot, 'nested', 'deep', 'directory');
            const testFile = join(nestedDir, 'test.txt');

            const fs = createMemFsEditor();
            // mem-fs creates directories implicitly when files are written
            writeFile(fs, testFile, 'test');
            await commit(fs);

            expect(fileExists(fs, testFile)).toBe(true);
        });
    });
});
