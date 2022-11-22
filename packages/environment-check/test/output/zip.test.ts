import * as mockFs from 'fs';
import type * as archiver from 'archiver';
import { archiveProject, storeResultsZip } from '../../src/output';
import { Check } from '../../src';

// Need to mock fs and archiver on top level before any test is run
jest.mock('fs');
let zipMock;
jest.mock('archiver', () => ({
    __esModule: true,
    'default': (): typeof zipMock => zipMock
}));

describe('Test to check zip save, storeResultsZip()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Check if writer is creating output appropriately', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 123456789
        } as unknown as archiver.Archiver;
        let writeStreamCloseCallback;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation((filename) => {
            return filename === 'envcheck-results.zip' ? writeStreamMock : undefined;
        });
        console.log = jest.fn();
        const requestedChecksSet = [Check.Environment, Check.Destinations, Check.EndpointResults];

        // Test execution
        storeResultsZip({ requestedChecks: requestedChecksSet });
        writeStreamCloseCallback();

        // Result check
        expect(zipMock.pipe).toBeCalledWith(writeStreamMock);
        expect(zipMock.append).toBeCalledTimes(2);
        expect(zipMock.finalize).toBeCalled();
        expect(console.log).toBeCalledWith(`Results written to file 'envcheck-results.zip' 117.74 MB`);
    });

    test('Check writer for file size 0 bytes, different filename, and ENOENT warning', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 0
        } as unknown as archiver.Archiver & { on: jest.Mock };
        let writeStreamCloseCallback;
        const writeStreamMock = {
            on: (name, callback) => {
                if (name === 'close') {
                    writeStreamCloseCallback = callback;
                }
            }
        } as unknown as mockFs.WriteStream & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation((filename) => {
            return filename === 'ANY_NAME' ? writeStreamMock : undefined;
        });
        console.log = jest.fn();
        console.warn = jest.fn();

        // Test execution
        storeResultsZip({}, 'ANY_NAME');
        writeStreamCloseCallback();
        zipMock.on.mock.calls.find((c) => c[0] === 'warning')[1]({ code: 'ENOENT' });

        // Result check
        expect(zipMock.pipe).toBeCalledWith(writeStreamMock);
        expect(zipMock.append).toBeCalled();
        expect(zipMock.finalize).toBeCalled();
        expect(console.log).toBeCalledWith(`Results written to file 'ANY_NAME' 0 Bytes`);
        expect(console.warn).toBeCalledWith({ code: 'ENOENT' });
    });

    test('Should throw exception for wrong writer warning', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 0
        } as unknown as archiver.Archiver & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(
            () =>
                ({
                    on: jest.fn()
                } as unknown as mockFs.WriteStream & { on: jest.Mock })
        );

        // Test execution
        storeResultsZip({});

        // Result check
        try {
            const warnHandler = zipMock.on.mock.calls.find((c) => c[0] === 'warning');
            if (warnHandler) {
                warnHandler[1]({});
            }
            fail('Waring callback should throw error but did not');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('Should throw exception for writer error', () => {
        // Mock setup
        zipMock = {
            on: jest.fn(),
            pipe: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn(),
            pointer: () => 0
        } as unknown as archiver.Archiver & { on: jest.Mock };
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(
            () =>
                ({
                    on: jest.fn()
                } as unknown as mockFs.WriteStream & { on: jest.Mock })
        );

        // Test execution
        storeResultsZip({});

        // Result check
        try {
            const warnHandler = zipMock.on.mock.calls.find((c) => c[0] === 'error');
            if (warnHandler) {
                warnHandler[1]({});
            }
            fail('Waring callback for zip error should throw error but did not');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});

describe('Test for archive project, archiveProject()', () => {
    test('Archive sample project with default name (mocked, no real zip is created)', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            glob: jest.fn().mockReturnValue({
                on: jest.fn().mockReturnValue({
                    pipe: jest.fn()
                })
            }),
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
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);

        // Test execution
        const result = await archiveProject('PROJECT_ROOT');

        // Result check
        expect(result.path).toMatch('PROJECT_ROOT');
        expect(result.size).toBe('117.74 MB');
        expect(zipMock.glob).toBeCalledWith(
            '**',
            { cwd: 'PROJECT_ROOT', ignore: ['**/.env', '**/node_modules'], skip: ['**/node_modules/**'] },
            {}
        );
    });

    test('Archive sample project TEST (mocked, no real zip is created), should write to TEST.zip', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            glob: jest.fn().mockReturnValue({
                on: jest.fn().mockReturnValue({
                    pipe: jest.fn()
                })
            }),
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
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);

        // Test execution
        const result = await archiveProject('PROJECT_ROOT', 'TEST');

        // Result check
        expect(result.path).toBe('TEST.zip');
        expect(result.size).toBe('0 Bytes');
    });

    test('Archive sample project PROJECT.zip (mocked, no real zip is created), should write to PROJECT.zip', async () => {
        // Mock setup
        let writeStreamCloseCallback;
        zipMock = {
            glob: jest.fn().mockReturnValue({
                on: jest.fn().mockReturnValue({
                    pipe: jest.fn()
                })
            }),
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
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);

        // Test execution
        const result = await archiveProject('PROJECT_ROOT', 'PROJECT.zip');

        // Result check
        expect(result.path).toBe('PROJECT.zip');
    });

    test('Call archive for non existing directory, should throw error', async () => {
        // Mock setup
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

        // Test execution
        try {
            await archiveProject('WRONG_ROOT');
            fail(`Call to archiveProject() with wrong root should have thrown error, but did not`);
        } catch (error) {
            // Result check
            expect(error.message).toContain('WRONG_ROOT');
        }
    });

    test('Call archive and error occurs', async () => {
        // Mock setup
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
        jest.spyOn(mockFs, 'createWriteStream').mockImplementation(() => {
            throw Error('ERROR');
        });

        // Test execution
        try {
            await archiveProject('ANY');
            fail(`Call to archiveProject() and error occurred, should have thrown error, but did not`);
        } catch (error) {
            // Result check
            expect(error.message).toContain('ERROR');
        }
    });
});
