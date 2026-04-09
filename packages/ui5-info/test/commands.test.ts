import { jest } from '@jest/globals';
import { createRequire } from 'node:module';
import os from 'node:os';

// Mock child_process spawn for the first describe block
const mockSpawnFn = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
    spawn: mockSpawnFn,
    default: { spawn: mockSpawnFn }
}));

// Dynamic imports after mocking
const { executeNpmUI5VersionsCmd } = await import('../src/commands');
const { getUI5Versions } = await import('../src/ui5-version-info');

const originalPlatform = process.platform;

/**
 * Tests that excercise commands.ts
 *
 */
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
        mockSpawnFn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn().mockImplementation((event: string, cb: any) => {
                        if (event === 'data') {
                            cb(Buffer.from(`['1.90.0', '1.90.1', '1.92.1', '1.93.0', '1.80-snapshot']`, 'utf8'));
                        }
                    }),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn().mockImplementation((event: string, cb: any) => {
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
        expect(mockSpawnFn).toHaveBeenCalled();
        expect(mockSpawnFn).toHaveBeenNthCalledWith(
            1,
            'npm',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            {}
        );
    });

    it('Validate exception spawn flow', async () => {
        mockSpawnFn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn().mockImplementation((event: string, cb: any) => {
                        if (event === 'data') {
                            cb(Buffer.from(`Command Failure`, 'utf8'));
                        }
                    })
                },
                on: jest.fn().mockImplementation((event: string, cb: any) => {
                    if (event === 'close') {
                        cb(1);
                    }
                })
            };
        });
        const retrievedUI5Versions = await getUI5Versions({
            onlyNpmVersion: true
        }); // expect defaults
        expect(retrievedUI5Versions).toMatchInlineSnapshot(`
            [
              {
                "version": "1.145.0",
              },
              {
                "version": "1.144.0",
              },
              {
                "version": "1.142.0",
              },
              {
                "version": "1.139.0",
              },
              {
                "version": "1.136.0",
              },
              {
                "version": "1.120.0",
              },
              {
                "version": "1.108.0",
              },
              {
                "version": "1.96.0",
              },
              {
                "version": "1.71.0",
              },
            ]
        `);
        expect(mockSpawnFn).toHaveBeenCalled();
        expect(mockSpawnFn).toHaveBeenNthCalledWith(
            1,
            'npm',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            {}
        );
    });

    it('Validate error spawn flow', async () => {
        mockSpawnFn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn(),
                    setEncoding: jest.fn()
                },
                on: jest.fn().mockImplementation((_event: string, cb: any) => {
                    cb(new Error('spawn ENOENT'));
                }),
                error: new Error('spawn ENOENT')
            };
        });
        await expect(() => executeNpmUI5VersionsCmd()).rejects.toThrow('Command failed with error: spawn ENOENT');
    });

    it('Validate spawn flow on windows', async () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        mockSpawnFn.mockImplementation((): any => {
            return {
                stdout: {
                    on: jest.fn().mockImplementation((event: string, cb: any) => {
                        if (event === 'data') {
                            cb(Buffer.from(`['1.90.0', '1.90.1', '1.92.1', '1.93.0', '1.80-snapshot']`, 'utf8'));
                        }
                    }),
                    setEncoding: jest.fn()
                },
                stderr: {
                    on: jest.fn()
                },
                on: jest.fn().mockImplementation((event: string, cb: any) => {
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
        expect(mockSpawnFn).toHaveBeenCalled();
        expect(mockSpawnFn).toHaveBeenNthCalledWith(
            1,
            'npm.cmd',
            ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'],
            { 'shell': true }
        );
    });
});

// Use createRequire for CJS-only mock-spawn module
const requireCjs = createRequire(import.meta.url);
const mockSpawn = requireCjs('mock-spawn');

describe('Test commands internals', () => {
    jest.setTimeout(10000);
    let mockedSpawn = mockSpawn();

    // We need a fresh import of commands that uses the real child_process
    // but with spawn replaced by mock-spawn
    beforeEach(async () => {
        mockedSpawn = mockSpawn();
        // Re-mock child_process with the mock-spawn instance
        mockSpawnFn.mockImplementation((...args: any[]) => mockedSpawn(...args));
    });

    it('Fails to spawn with error', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(1, 'Some log', 'stderr buffer'));
        mockedSpawn.sequence.add({ throws: new Error('spawn ENOENT') });
        await expect(executeNpmUI5VersionsCmd()).rejects.toThrow('spawn ENOENT');
    });

    it('Execute with success', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(0, `['1', '2', '3']`));
        await expect(executeNpmUI5VersionsCmd()).resolves.toEqual(['1', '2', '3']);
    });

    it('Execute with error code 1', async () => {
        mockedSpawn.setDefault(mockedSpawn.simple(1, '', 'stack trace'));
        const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
        await expect(executeNpmUI5VersionsCmd()).rejects.toMatchInlineSnapshot(
            `[Error: Command failed, \`${npmCmd} show @sapui5/distribution-metadata versions --no-color\`, stack trace]`
        );
    });
});
