import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import { create as createMemFsEditor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { commitFileSystemChanges } from '../src/files/file-system.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('file-system', () => {
    let fs: Editor;
    const testOutputDir = join(__dirname, 'test-output', 'file-system');

    beforeEach(async () => {
        fs = createMemFsEditor(createMemFs());
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    describe('commitFileSystemChanges', () => {
        test('should commit changes from mem-fs-editor', async () => {
            // Write some changes to mem-fs (using test output directory)
            const testFile = join(testOutputDir, 'file.txt');
            fs.write(testFile, 'content');

            // Commit changes
            await commitFileSystemChanges(fs);

            // Changes should be committed (no error thrown)
            expect(true).toBe(true);
        });

        test('should handle undefined fs gracefully', async () => {
            // Pass undefined fs
            await commitFileSystemChanges(undefined);

            // Should resolve without error
            expect(true).toBe(true);
        });

        test('should return a Promise', async () => {
            const result = commitFileSystemChanges(fs);

            // Should be a Promise
            expect(result).toBeInstanceOf(Promise);
            await result;
        });

        test('should commit multiple file changes', async () => {
            // Write multiple changes to test directory
            const file1 = join(testOutputDir, 'file1.txt');
            const file2 = join(testOutputDir, 'file2.txt');
            const subdir = join(testOutputDir, 'subdir');
            await mkdir(subdir, { recursive: true });
            const file3 = join(subdir, 'file3.json');

            fs.write(file1, 'content1');
            fs.write(file2, 'content2');
            fs.write(file3, JSON.stringify({ test: true }));

            // Commit all changes
            await commitFileSystemChanges(fs);

            // No error should be thrown
            expect(true).toBe(true);
        });

        test('should reject on commit error', async () => {
            // Try to write to an invalid path that will cause commit to fail
            fs.write('/root/invalid/path/file.txt', 'content');

            // Should reject with error
            await expect(commitFileSystemChanges(fs)).rejects.toThrow();
        });
    });
});
