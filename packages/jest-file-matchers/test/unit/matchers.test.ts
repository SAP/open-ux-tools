import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import type { MatcherIgnore } from '../../src/matchers/types.js';
import { README_GENERATION_PLATFORM_REGEX, README_GENERATOR_REGEX } from '../../src/matchers/types.js';
import { toMatchFolder, toContainAllFilesIn } from '../../src/index.js';
import { toMatchFile } from '../../src/matchers/toMatchFileSnapshot/index.js';
import '../../src/setup';

const __dirname = dirname(fileURLToPath(import.meta.url));

expect.extend({ toMatchFile, toMatchFolder, toContainAllFilesIn });

export const ignoreMatcherOpts: MatcherIgnore = {
    groups: [
        {
            filenames: ['README.md'],
            ignore: [README_GENERATOR_REGEX, README_GENERATION_PLATFORM_REGEX]
        }
    ]
};

describe('Test matchers', () => {
    const expectedFolder = join(__dirname, '../__fixtures__/expected/');

    it('should match folders', () => {
        const expected = join(expectedFolder, 'test-folder-expected');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-main');
        expect(receivedFolder).toMatchFolder(expected, ignoreMatcherOpts);
    });

    it('should not match folder with different file contents', () => {
        const expected = join(expectedFolder, 'test-folder-expected');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-different-files');
        expect(receivedFolder).not.toMatchFolder(expected);
    });

    it('should match nested folder structure', () => {
        const expected = join(expectedFolder, 'test-folder-expected-nested');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-nested');
        expect(receivedFolder).toMatchFolder(expected);
    });

    it('should exclude certain file extensions', () => {
        const expected = join(expectedFolder, 'test-folder-expected');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-extra-files');
        expect(expected).toMatchFolder(receivedFolder, { ...ignoreMatcherOpts, exclude: ['**.html', '**.ts'] });
    });

    it('should include certain file extensions', () => {
        const expected = join(expectedFolder, 'test-folder-expected');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-extra-files');
        expect(expected).toMatchFolder(receivedFolder, { include: ['**.js', '**.txt'] });
    });

    it('should fail with contain all files in', () => {
        const testFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-main');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-extra-files');
        // only expects that the files are named the same, not their contents
        // http://gliviu.github.io/dc-api/interfaces/Options.html
        expect(() => {
            expect(testFolder).toContainAllFilesIn(receivedFolder);
        }).toThrow('Missing in actual folder');
    });

    it('should fail with invalid regex', () => {
        const invalidignoreMatcherOpts = {
            groups: [
                {
                    filenames: ['README.md'],
                    ignore: ['(']
                }
            ]
        };
        const expected = join(expectedFolder, 'test-folder-expected');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-main');

        expect(() => {
            expect(receivedFolder).toMatchFolder(expected, invalidignoreMatcherOpts as any);
        }).toThrow(`Invalid ignore regex provided to file snapshot matcher: ${'('}`);
    });

    it('matches content of file on disk with specified filename', () => {
        expect(`# this is a test`).toMatchFile(join(__dirname, '../__fixtures__/output.md'));
    });

    it('matches content of file on disk without filename', () => {
        expect(`# this is a another test`).toMatchFile();
    });

    it('matches binary content of file on disk', () => {
        expect(fs.readFileSync(join(__dirname, '../__fixtures__/minimal.pdf'), 'binary')).toMatchFile();
    });

    it('works with .not', () => {
        expect(`# this is a nice test`).not.toMatchFile();
    });

    it('works with .not for binary files', () => {
        expect(fs.readFileSync(join(__dirname, '../__fixtures__/minimal.pdf'), 'binary')).not.toMatchFile();
    });

    describe('toContainAllFilesIn with updateSnapshot', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(join(os.tmpdir(), 'jest-file-matchers-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should delete a stale file from the snapshot folder when updateSnapshot is true', () => {
            // given: received has file.txt, snapshot has file.txt + stale.txt
            const receivedFolder = join(tmpDir, 'received');
            const snapshotFolder = join(tmpDir, 'snapshot');
            fs.mkdirSync(receivedFolder);
            fs.mkdirSync(snapshotFolder);
            fs.writeFileSync(join(receivedFolder, 'file.txt'), '');
            fs.writeFileSync(join(snapshotFolder, 'file.txt'), '');
            fs.writeFileSync(join(snapshotFolder, 'stale.txt'), '');
            const context = { isNot: false, snapshotState: { _updateSnapshot: 'all', updated: 0 } };

            // when
            const result = toContainAllFilesIn.call(
                context as unknown as jest.MatcherContext,
                receivedFolder,
                snapshotFolder
            );

            // then: stale.txt is deleted, pass is true, updated incremented
            expect(result.pass).toBe(true);
            expect(context.snapshotState.updated).toBe(1);
            expect(fs.existsSync(join(snapshotFolder, 'stale.txt'))).toBe(false);
            expect(fs.existsSync(join(snapshotFolder, 'file.txt'))).toBe(true);
        });

        it('should delete a stale nested directory from the snapshot folder when updateSnapshot is true', () => {
            // given: received has file.txt, snapshot has file.txt + stale-dir/nested.js
            const receivedFolder = join(tmpDir, 'received');
            const snapshotFolder = join(tmpDir, 'snapshot');
            fs.mkdirSync(receivedFolder);
            fs.mkdirSync(snapshotFolder);
            fs.writeFileSync(join(receivedFolder, 'file.txt'), '');
            fs.writeFileSync(join(snapshotFolder, 'file.txt'), '');
            const staleDir = join(snapshotFolder, 'stale-dir');
            fs.mkdirSync(staleDir);
            fs.writeFileSync(join(staleDir, 'nested.js'), '');
            const context = { isNot: false, snapshotState: { _updateSnapshot: 'all', updated: 0 } };

            // when
            const result = toContainAllFilesIn.call(
                context as unknown as jest.MatcherContext,
                receivedFolder,
                snapshotFolder
            );

            // then: stale-dir and its contents are deleted, pass is true
            expect(result.pass).toBe(true);
            expect(fs.existsSync(staleDir)).toBe(false);
            expect(fs.existsSync(join(snapshotFolder, 'file.txt'))).toBe(true);
        });
    });
});
