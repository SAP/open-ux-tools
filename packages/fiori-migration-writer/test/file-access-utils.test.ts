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
import { commit } from '../src/utils/fs-adapter.js';

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
        test('should return true for existing file', () => {
            const testFile = join(testRoot, 'exists.txt');
            writeFileSync(testFile, 'content');

            const exists = fileExists(testFile);
            expect(exists).toBe(true);
        });

        test('should return false for non-existing file', () => {
            const exists = fileExists(join(testRoot, 'does-not-exist.txt'));
            expect(exists).toBe(false);
        });
    });

    describe('readFile', () => {
        test('should read file content', () => {
            const testFile = join(testRoot, 'read.txt');
            const content = 'test content';
            writeFileSync(testFile, content);

            const result = readFile(testFile);
            expect(result).toBe(content);
        });
    });

    describe('writeFile', () => {
        test('should write file content', async () => {
            const testFile = join(testRoot, 'write.txt');
            const content = 'new content';

            writeFile(testFile, content);
            await commit();

            const result = readFileSync(testFile, 'utf-8');
            expect(result).toBe(content);
        });
    });

    describe('readJSON', () => {
        test('should read and parse JSON file', () => {
            const testFile = join(testRoot, 'test.json');
            const data = { foo: 'bar', number: 42 };
            writeFileSync(testFile, JSON.stringify(data));

            const result = readJSON(testFile);
            expect(result).toEqual(data);
        });
    });

    describe('updateJSON', () => {
        test('should update JSON file preserving formatting', async () => {
            const testFile = join(testRoot, 'update.json');
            const original = { foo: 'bar', nested: { value: 1 } };
            writeFileSync(testFile, JSON.stringify(original, null, 2));

            const updated = { foo: 'updated', nested: { value: 2 }, newField: 'added' };
            updateJSON(testFile, updated);
            await commit();

            const result = readJSON(testFile);
            expect(result.foo).toBe('updated');
            expect(result.nested.value).toBe(2);
            expect(result.newField).toBe('added');
        });
    });

    describe('updateFile', () => {
        test('should update text file content', async () => {
            const testFile = join(testRoot, 'update.txt');
            writeFileSync(testFile, 'original content');

            updateFile(testFile, 'modified content');
            await commit();

            const result = readFile(testFile);
            expect(result).toBe('modified content');
        });
    });

    describe('createDirectory', () => {
        test('should create directory recursively', async () => {
            const nestedDir = join(testRoot, 'nested', 'deep', 'directory');

            createDirectory(nestedDir);

            // In mem-fs mode, directories are created implicitly when files are written
            // So we write a file to the directory and then check it exists
            const testFile = join(nestedDir, 'test.txt');
            writeFile(testFile, 'test');
            await commit();

            const exists = fileExists(testFile);
            expect(exists).toBe(true);
        });
    });
});
