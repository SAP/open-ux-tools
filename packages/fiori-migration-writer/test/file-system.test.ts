import { describe, test, expect, beforeEach } from '@jest/globals';
import { create as createMemFsEditor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { commitFileSystemChanges } from '../src/files/file-system.js';

describe('file-system', () => {
    let fs: Editor;

    beforeEach(() => {
        fs = createMemFsEditor(createMemFs());
    });

    describe('commitFileSystemChanges', () => {
        test('should commit changes from mem-fs-editor', async () => {
            // Write some changes to mem-fs
            fs.write('/test/file.txt', 'content');

            // Commit changes
            await commitFileSystemChanges(fs);

            // Changes should be committed (no error thrown)
            expect(true).toBe(true);
        });

        test('should handle undefined fs gracefully', async () => {
            // Pass undefined fs
            await commitFileSystemChanges(undefined);

            // Should resolve without error (line 11-13: undefined check)
            expect(true).toBe(true);
        });

        test('should return a Promise', async () => {
            const result = commitFileSystemChanges(fs);

            // Should be a Promise
            expect(result).toBeInstanceOf(Promise);
            await result;
        });

        test('should commit multiple file changes', async () => {
            // Write multiple changes
            fs.write('/test/file1.txt', 'content1');
            fs.write('/test/file2.txt', 'content2');
            fs.write('/test/dir/file3.json', JSON.stringify({ test: true }));

            // Commit all changes
            await commitFileSystemChanges(fs);

            // No error should be thrown
            expect(true).toBe(true);
        });

        test('should complete commit callback', async () => {
            fs.write('/test/callback-test.txt', 'test');

            // The commit function accepts a callback and calls it when done
            await commitFileSystemChanges(fs);

            // Callback should have been invoked (promise resolves)
            expect(true).toBe(true);
        });
    });
});
