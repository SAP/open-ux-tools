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
    initI18n
} from '../../../src/index.js';
import { createMemFsEditor, runWithEditor } from '../../../src/utils/fs-adapter.js';

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

        test('should return true for a file that exists on disk but is not staged in mem-fs', async () => {
            // This is the mockserver.js overwrite bug: fileExists was only checking mem-fs,
            // so a pre-existing file on disk was invisible and would be overwritten.
            const testFile = join(testRoot, 'pre-existing.txt');
            writeFileSync(testFile, 'original content');

            const fs = createMemFsEditor();
            let existsInEditorContext: boolean | undefined;
            await runWithEditor(fs, async () => {
                existsInEditorContext = await fileExists(testFile);
            });

            expect(existsInEditorContext).toBe(true);
        });

        test('should return false for a file that does not exist on disk or in mem-fs', async () => {
            const testFile = join(testRoot, 'never-created.txt');

            const fs = createMemFsEditor();
            let existsInEditorContext: boolean | undefined;
            await runWithEditor(fs, async () => {
                existsInEditorContext = await fileExists(testFile);
            });

            expect(existsInEditorContext).toBe(false);
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

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                writeFile(testFile, content);

                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

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

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                const updated = { foo: 'updated', nested: { value: 2 }, newField: 'added' };
                updateJSON(testFile, updated);

                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

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

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                updateFile(testFile, 'modified content');

                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            const result = readFile(testFile);
            expect(result).toBe('modified content');
        });
    });

    describe('mem-fs directory handling', () => {
        test('should create directory implicitly when writing file', async () => {
            const nestedDir = join(testRoot, 'nested', 'deep', 'directory');

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                // mem-fs creates directories implicitly when files are written
                // No explicit directory creation needed
                const testFile = join(nestedDir, 'test.txt');
                writeFile(testFile, 'test');

                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            const testFile = join(nestedDir, 'test.txt');
            const exists = await fileExists(testFile);
            expect(exists).toBe(true);
        });
    });
});
