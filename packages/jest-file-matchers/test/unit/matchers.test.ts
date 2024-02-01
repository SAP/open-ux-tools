import { join } from 'path';
import fs from 'fs';
import { toMatchFolder, toContainAllFilesIn } from '../../src';
import { MatcherIgnore, README_GENERATION_PLATFORM_REGEX, README_GENERATOR_REGEX } from '../../src/matchers/types';
import { toMatchFile } from '../../src/matchers/toMatchFileSnapshot';

expect.extend({ toMatchFolder, toContainAllFilesIn, toMatchFile });

export const ignoreMatcherOpts: MatcherIgnore = {
    groups: [
        {
            filenames: ['README.md'],
            ignore: [README_GENERATOR_REGEX, README_GENERATION_PLATFORM_REGEX]
        }
    ]
};

describe('Test matchers', () => {
    const expectedFolder = join(__dirname, '../__fixtures__/expected/test-folder-expected');

    it('should match folders', () => {
        const receivedFolder = join(__dirname, '../__fixtures__/test-folder');
        expect(receivedFolder).toMatchFolder(expectedFolder, ignoreMatcherOpts);
    });

    it('should not match folder with different file contents', () => {
        const receivedFolder = join(__dirname, '../__fixtures__/test-folder-different-files');
        expect(receivedFolder).not.toMatchFolder(expectedFolder);
    });

    it('should exclude certain file extensions', () => {
        const receivedFolder = join(__dirname, '../__fixtures__/test-folder-extra-files');
        expect(expectedFolder).toMatchFolder(receivedFolder, { ...ignoreMatcherOpts, exclude: ['**.html', '**.ts'] });
    });

    it('should include certain file extensions', () => {
        const testFolder = join(__dirname, '../__fixtures__/test-folder');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folder-extra-files');
        expect(testFolder).toMatchFolder(receivedFolder, { include: ['**.js', '**.txt'] });
    });

    it('should fail with contain all files in', () => {
        const testFolder = join(__dirname, '../__fixtures__/test-folder');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folder-extra-files');
        expect(() => {
            expect(testFolder).toContainAllFilesIn(receivedFolder);
        }).toThrow();
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

        const receivedFolder = join(__dirname, '../__fixtures__/test-folder');

        expect(() => {
            expect(receivedFolder).toMatchFolder(expectedFolder, invalidignoreMatcherOpts as any);
        }).toThrowError(`Invalid ignore regex provided to file snapshot matcher: ${'('}`);
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
});
