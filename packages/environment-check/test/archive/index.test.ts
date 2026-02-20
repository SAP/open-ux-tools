import type * as archiver from 'archiver';
import { join } from 'node:path';
import * as mockFs from 'node:fs';
import * as mockGlobGitignore from 'glob-gitignore';

import { archiveProject } from '../../src/archive';

jest.mock('glob-gitignore');
jest.mock('fs', () => ({
    __esModule: true,
    promises: { readFile: jest.fn() },
    createWriteStream: jest.fn(),
    existsSync: jest.fn()
}));
let zipMock;
jest.mock('archiver', () => ({
    __esModule: true,
    'default': (): typeof zipMock => zipMock
}));

describe('Test for archive project, archiveProject()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Archive sample project with default name and no .gitignore (mocked, no real zip is created)', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            pipe: jest.fn(),
            on: jest.fn(),
            file: jest.fn(),
            pointer: () => 123456789,
            finalize: () => {
                writeStreamCloseCallback();
            }
        } as unknown as archiver.Archiver;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => writeStreamMock);
        jest.spyOn(mockFs, 'existsSync')
            .mockImplementationOnce(() => true)
            .mockImplementationOnce(() => false);
        const mockGlob = jest
            .spyOn(mockGlobGitignore, 'glob')
            .mockImplementation(() => Promise.resolve(['FILE_ONE', 'FILE_TWO']));

        // Test execution
        const result = await archiveProject({ projectRoot: 'PROJECT_ROOT' });

        // Result check
        expect(result.path).toMatch('PROJECT_ROOT');
        expect(result.size).toBe('117.74 MB');
        expect(zipMock.file).toHaveBeenNthCalledWith(1, join('PROJECT_ROOT/FILE_ONE'), { 'name': 'FILE_ONE' });
        expect(zipMock.file).toHaveBeenNthCalledWith(2, join('PROJECT_ROOT/FILE_TWO'), { 'name': 'FILE_TWO' });
        const [globPattern, globOptions] = mockGlob.mock.calls[0] as [
            string[],
            { cwd: string; dot: boolean; skip: string[] | undefined; mark: boolean; ignore: any }
        ];
        expect(globPattern).toEqual(['**', '.cdsrc.json', '.extconfig.json']);
        expect(globOptions.cwd).toBe('PROJECT_ROOT');
        expect(globOptions.dot).toBe(false);
        expect(globOptions.mark).toEqual(true);
        expect(globOptions.skip).toEqual(['**/node_modules/**']);
        expect(globOptions.ignore._rules.length).toBe(3);
        expect(globOptions.ignore._rules[1].pattern).toBe('**/.git');
    });

    test('Archive sample project with default name and .gitignore (mocked, no real zip is created)', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            pipe: jest.fn(),
            on: jest.fn(),
            file: jest.fn(),
            pointer: () => 123456789,
            finalize: () => {
                writeStreamCloseCallback();
            }
        } as unknown as archiver.Archiver;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => writeStreamMock);
        jest.spyOn(mockFs, 'existsSync')
            .mockImplementationOnce(() => true)
            .mockImplementationOnce(() => true);
        jest.spyOn(mockFs.promises, 'readFile').mockReturnValueOnce(
            Promise.resolve('#some comment\nexcludedir/\nexcludefile\n**/nm')
        );
        const mockGlob = jest
            .spyOn(mockGlobGitignore, 'glob')
            .mockImplementation(() => Promise.resolve(['FILE_ONE', 'FILE_TWO']));

        // Test execution
        const result = await archiveProject({ projectRoot: 'PRJ_GITIGNORE' });

        // Result check
        expect(result.path).toMatch('PRJ_GITIGNORE');
        expect(result.size).toBe('117.74 MB');
        expect(zipMock.file).toHaveBeenNthCalledWith(1, join('PRJ_GITIGNORE/FILE_ONE'), { 'name': 'FILE_ONE' });
        expect(zipMock.file).toHaveBeenNthCalledWith(2, join('PRJ_GITIGNORE/FILE_TWO'), { 'name': 'FILE_TWO' });
        const [globPattern, globOptions] = mockGlob.mock.calls[0] as [
            string[],
            { cwd: string; dot: boolean; skip: string[] | undefined; mark: boolean; ignore: any }
        ];
        expect(globPattern).toEqual(['**']);
        expect(globOptions.cwd).toBe('PRJ_GITIGNORE');
        expect(globOptions.dot).toBe(true);
        expect(globOptions.mark).toEqual(true);
        expect(globOptions.skip).toBe(undefined);
        expect(globOptions.ignore._rules.length).toBe(4);
        expect(globOptions.ignore._rules[0].pattern).toBe('excludedir/');
        expect(globOptions.ignore._rules[1].pattern).toBe('excludefile');
        expect(globOptions.ignore._rules[2].pattern).toBe('**/nm');
        expect(globOptions.ignore._rules[3].pattern).toBe('**/.git');
    });

    test('Archive sample project TEST (mocked, no real zip is created), should write to TEST.zip', async () => {
        let writeStreamCloseCallback;
        zipMock = {
            pipe: jest.fn(),
            on: jest.fn(),
            file: jest.fn(),
            pointer: () => 0,
            finalize: () => {
                writeStreamCloseCallback();
            }
        } as unknown as archiver.Archiver;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => writeStreamMock);
        jest.spyOn(mockFs, 'existsSync')
            .mockImplementationOnce(() => true)
            .mockImplementationOnce(() => false);

        // Test execution
        const result = await archiveProject({ projectRoot: 'PROJECT_ROOT', targetFileName: 'TEST' });

        // Result check
        expect(result.path).toBe('TEST.zip');
        expect(result.size).toBe('0 Bytes');
    });

    test('Archive sample project PROJECT.zip (mocked, no real zip is created), should write to PROJECT.zip', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            pipe: jest.fn(),
            on: jest.fn(),
            file: jest.fn(),
            pointer: () => 1,
            finalize: () => {
                writeStreamCloseCallback();
            }
        } as unknown as archiver.Archiver;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => writeStreamMock);
        jest.spyOn(mockFs, 'existsSync')
            .mockImplementationOnce(() => true)
            .mockImplementationOnce(() => false);

        // Test execution
        const result = await archiveProject({ projectRoot: 'PROJECT_ROOT', targetFileName: 'PROJECT.zip' });

        // Result check
        expect(result.path).toBe('PROJECT.zip');
        expect(result.size).toBe('1 Bytes');
    });

    test('Archive sample project PROJECT.zip (mocked, no real zip is created), should write to specified targetPath archiveFolder/PROJECT.zip', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            pipe: jest.fn(),
            on: jest.fn(),
            file: jest.fn(),
            pointer: () => 1,
            finalize: () => {
                writeStreamCloseCallback();
            }
        } as unknown as archiver.Archiver;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => writeStreamMock);
        jest.spyOn(mockFs, 'existsSync')
            .mockImplementationOnce(() => true)
            .mockImplementationOnce(() => false);

        // Test execution
        const result = await archiveProject({
            projectRoot: 'PROJECT_ROOT',
            targetFolder: 'archiveFolder',
            targetFileName: 'PROJECT.zip'
        });

        // Result check
        expect(result.path).toBe(join('archiveFolder', 'PROJECT.zip'));
        expect(result.size).toBe('1 Bytes');
    });

    test('Call archive for non existing directory, should throw error', async () => {
        // Mock setup
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

        // Test execution
        try {
            await archiveProject({ projectRoot: 'WRONG_ROOT' });
            fail(`Call to archiveProject() with wrong root should have thrown error, but did not`);
        } catch (error) {
            // Result check
            expect(error.message).toContain('WRONG_ROOT');
        }
    });

    test('Call archive and error occurs during file list retrieval', async () => {
        // Mock setup
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
        jest.spyOn(mockFs.promises, 'readFile').mockRejectedValueOnce(new Error('ERROR'));

        // Test execution
        try {
            await archiveProject({ projectRoot: 'ANY' });
            fail(`Call to archiveProject() and error occurred, should have thrown error, but did not`);
        } catch (error) {
            // Result check
            expect(error.message).toContain('ERROR');
        }
    });

    test('Call archive and error occurs during zip processing', async () => {
        // Mock setup
        jest.spyOn(mockFs, 'existsSync')
            .mockImplementationOnce(() => true)
            .mockImplementationOnce(() => false);
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => {
            throw Error('ERROR');
        });

        // Test execution
        try {
            await archiveProject({ projectRoot: 'ANY' });
            fail(`Call to archiveProject() and error occurred, should have thrown error, but did not`);
        } catch (error) {
            // Result check
            expect(error.message).toContain('ERROR');
        }
    });
});
