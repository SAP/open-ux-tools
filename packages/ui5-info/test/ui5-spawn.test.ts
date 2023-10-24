jest.disableAutomock();

import * as cp from 'child_process';
import { CommandRunner } from '../src/commandRunner';
import { getUI5Versions } from '../src/ui5-info';

jest.mock('child_process');
const mockedCp = jest.mocked(cp, { shallow: true });
const originalPlatform = process.platform;

describe('Retrieve NPM UI5 mocking spawn process', () => {
    beforeEach(() => {
        Object.defineProperty(process, 'platform', {
            value: 'JestMockOs'
        });
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    it('Validate spawn flow', async () => {
        mockedCp.spawn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn().mockImplementation((event, cb) => {
                        if (event === 'data') {
                            cb(Buffer.from(`['1.90.0', '1.90.1', '1.92.1', '1.93.0', '1.80-snapshot']`, 'utf8'));
                        }
                    }),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn().mockImplementation((event, cb) => {
                    if (event === 'close') {
                        cb(0);
                    }
                })
            };
        });
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.93.0' });
        expect(retrievedUI5Versions).toMatchInlineSnapshot(`
            [
              {
                "version": "1.93.0",
              },
              {
                "version": "1.92.1",
              },
              {
                "version": "1.90.1",
              },
              {
                "version": "1.90.0",
              },
            ]
        `); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
        expect(mockedCp.spawn).toBeCalled();
        expect(mockedCp.spawn).nthCalledWith(
            1,
            'npm',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            {}
        );
    });

    it('Validate exception spawn flow', async () => {
        mockedCp.spawn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn().mockImplementation((event, cb) => {
                        if (event === 'data') {
                            cb(Buffer.from(`Command Failure`, 'utf8'));
                        }
                    })
                },
                on: jest.fn().mockImplementation((event, cb) => {
                    if (event === 'close') {
                        cb(1);
                    }
                })
            };
        });
        const retrievedUI5Versions = await getUI5Versions({
            onlyNpmVersion: true
        }); // Will throw an exception
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.104.0' });
        expect(retrievedUI5Versions.length).toEqual(39);
        expect(retrievedUI5Versions).toMatchSnapshot();
        expect(mockedCp.spawn).toBeCalled();
        expect(mockedCp.spawn).nthCalledWith(
            1,
            'npm',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            {}
        );
    });

    it('Validate error spawn flow', async () => {
        mockedCp.spawn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                on: jest.fn().mockImplementation((event, cb) => {
                    cb(new Error('spawn ENOENT'));
                }),
                error: new Error('spawn ENOENT')
            };
        });
        const runner = new CommandRunner();
        await expect(() => runner.run('fakeCmd')).rejects.toThrowError('Command failed with error: spawn ENOENT');
    });

    it('Validate spawn flow on windows', async () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        mockedCp.spawn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn().mockImplementation((event, cb) => {
                        if (event === 'data') {
                            cb(Buffer.from(`['1.90.0', '1.90.1', '1.92.1', '1.93.0', '1.80-snapshot']`, 'utf8'));
                        }
                    }),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn().mockImplementation((event, cb) => {
                    if (event === 'close') {
                        cb(0);
                    }
                })
            };
        });
        const retrievedUI5Versions = await getUI5Versions({ onlyNpmVersion: true });
        expect(retrievedUI5Versions[0]).toEqual({ version: '1.93.0' });
        expect(retrievedUI5Versions).toMatchInlineSnapshot(`
            [
              {
                "version": "1.93.0",
              },
              {
                "version": "1.92.1",
              },
              {
                "version": "1.90.1",
              },
              {
                "version": "1.90.0",
              },
            ]
        `); // Sorted
        expect(retrievedUI5Versions.length).toEqual(4);
        expect(mockedCp.spawn).toBeCalled();
        expect(mockedCp.spawn).nthCalledWith(
            1,
            'npm.cmd',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            {}
        );
    });
});
