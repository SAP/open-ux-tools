import { join } from 'path';
import { toMatchFolder, toContainAllFilesIn } from '../../src';
import { MatcherIgnore, README_GENERATION_PLATFORM_REGEX, README_GENERATOR_REGEX } from '../../src/matchers/types';

expect.extend({ toMatchFolder, toContainAllFilesIn });

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
});
