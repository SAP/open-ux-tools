import { join } from 'path';
import fs from 'fs';
import { MatcherIgnore, README_GENERATION_PLATFORM_REGEX, README_GENERATOR_REGEX } from '../../src/matchers/types';
import { toMatchFolder, toContainAllFilesIn } from '../../src/index';
import { toMatchFile } from '../../src/matchers/toMatchFileSnapshot';

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
    beforeAll(() => {
        require('../../src/setup');
    });

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
        const expected = join(expectedFolder, 'test-folder-expected');
        const receivedFolder = join(__dirname, '../__fixtures__/test-folders/test-folder-main');

        expect(() => {
            expect(receivedFolder).toMatchFolder(expected, invalidignoreMatcherOpts as any);
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
