jest.disableAutomock();

import * as cp from 'child_process';
import { CommandRunner } from '../src/commandRunner';

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
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(retrievedUI5Versions[0]).toEqual('1.93.0');
        expect(retrievedUI5Versions).toMatchInlineSnapshot(`
            Array [
              "1.93.0",
              "1.92.1",
              "1.90.1",
              "1.90.0",
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
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true }); // Will throw an exception
        expect(retrievedUI5Versions[0]).toEqual('1.104.0');
        expect(retrievedUI5Versions).toMatchInlineSnapshot(`
            Array [
              "1.104.0",
              "1.103.0",
              "1.102.0",
              "1.101.0",
              "1.100.0",
              "1.99.0",
              "1.98.0",
              "1.97.0",
              "1.96.0",
              "1.95.0",
              "1.94.0",
              "1.93.0",
              "1.92.0",
              "1.91.0",
              "1.90.0",
              "1.89.0",
              "1.88.0",
              "1.87.0",
              "1.86.0",
              "1.85.0",
              "1.84.0",
              "1.82.0",
              "1.81.0",
              "1.80.0",
              "1.79.0",
              "1.78.0",
              "1.77.0",
              "1.76.0",
            ]
        `);
        expect(retrievedUI5Versions.length).toEqual(28);
        expect(mockedCp.spawn).toBeCalled();
        expect(mockedCp.spawn).nthCalledWith(
            1,
            'npm',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            {}
        );
    });

    it('Validate error spawn flow', async () => {
        mockedCp.spawn.mock;
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
        await runner.run('fakeCmd').catch((e) => {
            expect(e).toEqual('Command failed with error: spawn ENOENT');
        });
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
        const retrievedUI5Versions = await retrieveUI5Versions({ onlyNpmVersion: true });
        expect(retrievedUI5Versions[0]).toEqual('1.93.0');
        expect(retrievedUI5Versions).toMatchInlineSnapshot(`
            Array [
              "1.93.0",
              "1.92.1",
              "1.90.1",
              "1.90.0",
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
