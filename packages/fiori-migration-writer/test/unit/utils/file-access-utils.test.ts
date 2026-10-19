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

        // Regression: during migration an editor is active in context, but the source
        // project's files live on disk and are not staged in mem-fs. fileExists must still
        // see them, otherwise merge handlers (package.json, .gitignore) silently overwrite
        // existing files with a scratch template.
        test('should return true for an on-disk file not staged in the editor context', async () => {
            const testFile = join(testRoot, 'on-disk-unstaged.txt');
            writeFileSync(testFile, 'content');

            const fs = createMemFsEditor();
            const exists = await runWithEditor(fs, async () => fileExists(testFile));
            expect(exists).toBe(true);
        });

        test('should return true for a file staged (written) in the editor context', async () => {
            const testFile = join(testRoot, 'staged-write.txt');

            const fs = createMemFsEditor();
            const exists = await runWithEditor(fs, async () => {
                writeFile(testFile, 'content');
                return fileExists(testFile);
            });
            expect(exists).toBe(true);
        });

        test('should return false for a file deleted in the editor context even if it exists on disk', async () => {
            const testFile = join(testRoot, 'staged-delete.txt');
            writeFileSync(testFile, 'content');

            const fs = createMemFsEditor();
            const exists = await runWithEditor(fs, async () => {
                deleteFile(testFile);
                return fileExists(testFile);
            });
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

        test('should read file content from an explicit editor', () => {
            const testFile = join(testRoot, 'read-explicit.txt');
            const fs = createMemFsEditor();
            fs.write(testFile, 'editor content');

            const result = readFile(fs, testFile);
            expect(result).toBe('editor content');
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

        test('should write file content via an explicit editor', async () => {
            const testFile = join(testRoot, 'write-explicit.txt');
            const fs = createMemFsEditor();

            writeFile(fs, testFile, 'explicit content');

            await new Promise<void>((resolve, reject) => {
                fs.commit((err) => (err ? reject(err) : resolve()));
            });

            expect(readFileSync(testFile, 'utf-8')).toBe('explicit content');
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

        test('should read JSON from the mem-fs editor when a context editor is active', async () => {
            const testFile = join(testRoot, 'context.json');
            const data = { staged: true };

            const fs = createMemFsEditor();
            let result: typeof data | undefined;
            await runWithEditor(fs, async () => {
                fs.write(testFile, JSON.stringify(data));
                result = await readJSON<typeof data>(testFile);
            });

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

        test('should write a new JSON file with default indentation when none exists', async () => {
            const testFile = join(testRoot, 'new.json');

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                // File does not exist yet, so updateJSON falls into the catch branch
                // and writes with default 4-space indentation.
                updateJSON(testFile, { created: true });

                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => (err ? reject(err) : resolve()));
                });
            });

            const raw = readFileSync(testFile, 'utf-8');
            expect(raw).toBe('{\n    "created": true\n}\n');
        });

        test('should update JSON via an explicit editor', async () => {
            const testFile = join(testRoot, 'update-explicit.json');
            const fs = createMemFsEditor();
            fs.write(testFile, JSON.stringify({ value: 1 }, null, 2));

            updateJSON(fs, testFile, { value: 2 });

            await new Promise<void>((resolve, reject) => {
                fs.commit((err) => (err ? reject(err) : resolve()));
            });

            const result = await readJSON(testFile);
            expect(result.value).toBe(2);
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

        test('should update text file content via an explicit editor', async () => {
            const testFile = join(testRoot, 'update-explicit.txt');
            const fs = createMemFsEditor();
            fs.write(testFile, 'original');

            updateFile(fs, testFile, 'updated via editor');

            await new Promise<void>((resolve, reject) => {
                fs.commit((err) => (err ? reject(err) : resolve()));
            });

            expect(readFileSync(testFile, 'utf-8')).toBe('updated via editor');
        });
    });

    describe('deleteFile', () => {
        test('should delete a file via the mem-fs editor', async () => {
            const testFile = join(testRoot, 'to-delete.txt');
            writeFileSync(testFile, 'delete me');

            const fs = createMemFsEditor();
            await runWithEditor(fs, async () => {
                deleteFile(testFile);

                await new Promise<void>((resolve, reject) => {
                    fs.commit((err) => (err ? reject(err) : resolve()));
                });
            });

            const exists = await fileExists(testFile);
            expect(exists).toBe(false);
        });

        test('should delete a file via an explicit editor', async () => {
            const testFile = join(testRoot, 'to-delete-explicit.txt');
            writeFileSync(testFile, 'delete me');

            const fs = createMemFsEditor();
            deleteFile(fs, testFile);

            await new Promise<void>((resolve, reject) => {
                fs.commit((err) => (err ? reject(err) : resolve()));
            });

            expect(await fileExists(testFile)).toBe(false);
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
