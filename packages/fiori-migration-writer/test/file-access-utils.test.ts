import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
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
    createDirectory,
    initI18n
} from '../src/index.js';

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
        test('should return true for existing file', async () => {
            const testFile = join(testRoot, 'exists.txt');
            writeFileSync(testFile, 'content');

            const exists = await fileExists(testFile);
            expect(exists).toBe(true);
        });

        test('should return false for non-existing file', async () => {
            const exists = await fileExists(join(testRoot, 'does-not-exist.txt'));
            expect(exists).toBe(false);
        });
    });

    describe('readFile', () => {
        test('should read file content', async () => {
            const testFile = join(testRoot, 'read.txt');
            const content = 'test content';
            writeFileSync(testFile, content);

            const result = await readFile(testFile);
            expect(result).toBe(content);
        });
    });

    describe('writeFile', () => {
        test('should write file content', async () => {
            const testFile = join(testRoot, 'write.txt');
            const content = 'new content';

            await writeFile(testFile, content);

            const result = readFileSync(testFile, 'utf-8');
            expect(result).toBe(content);
        });
    });

    describe('readJSON', () => {
        test('should read and parse JSON file', async () => {
            const testFile = join(testRoot, 'test.json');
            const data = { foo: 'bar', number: 42 };
            writeFileSync(testFile, JSON.stringify(data));

            const result = await readJSON(testFile);
            expect(result).toEqual(data);
        });
    });

    describe('updateJSON', () => {
        test('should update JSON file preserving formatting', async () => {
            const testFile = join(testRoot, 'update.json');
            const original = { foo: 'bar', nested: { value: 1 } };
            writeFileSync(testFile, JSON.stringify(original, null, 2));

            const updated = { foo: 'updated', nested: { value: 2 }, newField: 'added' };
            await updateJSON(testFile, updated);

            const result = await readJSON(testFile);
            expect(result.foo).toBe('updated');
            expect(result.nested.value).toBe(2);
            expect(result.newField).toBe('added');
        });
    });

    describe('updateFile', () => {
        test('should update text file content', async () => {
            const testFile = join(testRoot, 'update.txt');
            writeFileSync(testFile, 'original content');

            await updateFile(testFile, 'modified content');

            const result = await readFile(testFile);
            expect(result).toBe('modified content');
        });
    });

    describe('createDirectory', () => {
        test('should create directory recursively', async () => {
            const nestedDir = join(testRoot, 'nested', 'deep', 'directory');

            await createDirectory(nestedDir);

            const exists = await fileExists(nestedDir);
            expect(exists).toBe(true);
        });
    });
});
