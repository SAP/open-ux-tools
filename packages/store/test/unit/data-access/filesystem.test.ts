import 'jest-extended';
import { jest } from '@jest/globals';
import { vol, fs as memfs } from 'memfs';
import type { FSWatcher } from 'node:fs';

// Import actual modules BEFORE mocking to avoid infinite loops
const actualOs = await import('node:os');
const actualPath = await import('node:path');

// Mock 'fs' and 'node:fs' with memfs — spread all named exports
// Also add mockable functions for watcher and write tests
const mockExistsSync = jest.fn<typeof memfs.existsSync>((...args: any[]) => (memfs.existsSync as any)(...args));
const mockWatch = jest.fn();
const mockWriteFileSync = jest.fn((...args: any[]) => (memfs.writeFileSync as any)(...args));

const fsMockFactory = () => ({
    ...memfs,
    default: { ...memfs, existsSync: mockExistsSync, watch: mockWatch, writeFileSync: mockWriteFileSync },
    existsSync: mockExistsSync,
    watch: mockWatch,
    writeFileSync: mockWriteFileSync
});

jest.unstable_mockModule('fs', fsMockFactory);
jest.unstable_mockModule('node:fs', fsMockFactory);

const mockHomedir = jest.fn().mockReturnValue('/');

const osMockFactory = () => ({
    ...actualOs,
    default: { ...actualOs.default, homedir: mockHomedir },
    homedir: mockHomedir
});

jest.unstable_mockModule('os', osMockFactory);
jest.unstable_mockModule('node:os', osMockFactory);

// Mock path so spyOn works (ESM module namespaces are frozen)
const mockPathJoin = jest.fn<typeof actualPath.join>((...args: string[]) => actualPath.join(...args));
jest.unstable_mockModule('node:path', () => ({
    ...actualPath,
    default: { ...actualPath.default, join: mockPathJoin },
    join: mockPathJoin
}));
jest.unstable_mockModule('path', () => ({
    ...actualPath,
    default: { ...actualPath.default, join: mockPathJoin },
    join: mockPathJoin
}));

const { basedir, getFilesystemStore, getFilesystemWatcherFor } = await import('../../../src/data-access/filesystem');
const path = await import('node:path');
const fs = await import('node:fs');
const { ToolsLogger, NullTransport } = await import('@sap-ux/logger');

describe('data-access/filesystem', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('read', () => {
        beforeEach(() => {
            vol.reset();
        });

        it.each(['', '  ', undefined])(
            'will return undefined when entity name is %p',
            async (entityName: string | undefined) => {
                await expect(getFilesystemStore(logger).read({ entityName, id: '42' })).resolves.toBeUndefined();
            }
        );

        it('will return undefined when fiori tools directory is missing', async () => {
            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('will return undefined when entity file is missing', async () => {
            vol.fromNestedJSON({
                [basedir()]: {}
            });

            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('will return undefined when entity file has unexpected format', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ otherEntity: [] })
            });

            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('will return undefined when entity file is empty', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: ''
            });

            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('will throw an error when entity file is corrupt', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: '{'
            });

            await expect(() => getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).rejects.toThrow();
        });

        it('will return undefined when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: [] })
            });

            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('will return undefined when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: undefined })
            });

            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('will return undefined when no entities match', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: {
                        '41': { prop1: 41, prop2: '13' },
                        '13': { prop1: 42, prop2: '1' }
                    }
                })
            });

            await expect(getFilesystemStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });
    });

    describe('getAll', () => {
        beforeEach(() => {
            vol.reset();
        });

        it.each(['', '  ', undefined])(
            'will return [] when entity name is %p',
            async (entityName: string | undefined) => {
                await expect(getFilesystemStore(logger).getAll({ entityName })).resolves.toEqual([]);
            }
        );

        it('will return [] when fiori tools directory is missing', async () => {
            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
        });

        it('will return [] when entity file is missing', async () => {
            vol.fromNestedJSON({
                [basedir()]: {}
            });

            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
        });

        it('will return [] when entity file has unexpected format', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ otherEntity: [] })
            });

            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
        });

        it('will return [] when entity file is empty', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: ''
            });

            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
        });

        it('will throw an error when entity file is corrupt', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: '{'
            });

            await expect(() => getFilesystemStore(logger).getAll({ entityName: 'dummy' })).rejects.toThrow();
        });

        it('will return [] when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: [] })
            });

            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
        });

        it('will return [] when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: undefined })
            });

            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
        });

        it('will return all the entities', async () => {
            const existingEntities = {
                '1': { prop1: 41, prop2: '13' },
                '2': { prop1: 42, prop2: '1' },
                '3': { prop1: 42, prop2: '13', prop3: 1 },
                '4': { prop1: 42, prop2: '1', prop3: 2 }
            };
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: existingEntities
                })
            });

            await expect(getFilesystemStore(logger).getAll({ entityName: 'dummy' })).resolves.toIncludeSameMembers(
                Object.values(existingEntities)
            );
        });
    });

    describe('readAll', () => {
        beforeEach(() => {
            vol.reset();
        });

        it.each(['', '  ', undefined])(
            'will return [] when entity name is %p',
            async (entityName: string | undefined) => {
                await expect(getFilesystemStore(logger).readAll({ entityName })).resolves.toEqual({});
            }
        );

        it('will return {} when fiori tools directory is missing', async () => {
            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual({});
        });

        it('will return {} when entity file is missing', async () => {
            vol.fromNestedJSON({
                [basedir()]: {}
            });

            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual({});
        });

        it('will return {} when entity file has unexpected format', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ otherEntity: {} })
            });

            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual({});
        });

        it('will return {} when entity file is empty', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: ''
            });

            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual({});
        });

        it('will throw an error when entity file is corrupt', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: '{'
            });

            await expect(() => getFilesystemStore(logger).readAll({ entityName: 'dummy' })).rejects.toThrow();
        });

        it('will return [] when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: {} })
            });

            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual({});
        });

        it('will return {} when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: undefined })
            });

            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual({});
        });

        it('will return all the entities', async () => {
            const existingEntities = {
                '1': { prop1: 41, prop2: '13' },
                '2': { prop1: 42, prop2: '1' },
                '3': { prop1: 42, prop2: '13', prop3: 1 },
                '4': { prop1: 42, prop2: '1', prop3: 2 }
            };
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: existingEntities
                })
            });

            await expect(getFilesystemStore(logger).readAll({ entityName: 'dummy' })).resolves.toEqual(
                existingEntities
            );
        });

        it('will not throw an error when entry is undefined', async () => {
            const existingEntities = {
                '1': { prop1: 41, prop2: '13' },
                '2': { prop1: 42, prop2: '1' },
                '3': { prop1: 42, prop2: '13', prop3: 1 },
                '4': undefined
            };
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: existingEntities
                })
            });

            await expect(() => getFilesystemStore(logger).readAll({ entityName: '4' })).not.toThrow();
        });
    });

    describe('write', () => {
        beforeEach(() => {
            vol.reset();
            jest.clearAllMocks();
        });

        it.each(['', '  ', undefined])(
            'will return undefined when entity name is %p',
            async (entityName: string | undefined) => {
                await expect(
                    getFilesystemStore(logger).write({ entityName, id: '42', entity: { prop1: 1, prop2: 2 } })
                ).resolves.toBeUndefined();
            }
        );

        it('will create the full path if root dir missing', async () => {
            const entity = { prop1: 1, prop2: 2 };
            const id = '42';
            await expect(getFilesystemStore(logger).write({ entityName: 'dummy', id, entity })).resolves.toEqual(
                entity
            );

            const dataFileFullPath = path.join(basedir(), 'dummies.json');
            expect(fs.existsSync(dataFileFullPath)).toBeTruthy();
            expect(JSON.parse(fs.readFileSync(dataFileFullPath).toString())).toEqual({
                dummies: { [id]: entity }
            });
        });

        it('will throw an error if the file is corrupt', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: '{'
            });
            const entity = { prop1: 1, prop2: '2', prop3: undefined, prop4: 42 };

            await expect(() =>
                getFilesystemStore(logger).write({ entityName: 'dummy', id: '42', entity })
            ).rejects.toThrow();
        });

        it('will throw an error if write fails', async () => {
            const entity = { prop1: 1, prop2: '2', prop3: undefined, prop4: 42 };
            mockWriteFileSync.mockImplementationOnce(() => {
                throw new Error();
            });

            await expect(() =>
                getFilesystemStore(logger).write({ entityName: 'dummy', id: '42', entity })
            ).rejects.toThrow();

            mockWriteFileSync.mockImplementation((...args: any[]) => (memfs.writeFileSync as any)(...args));
        });

        it('will create the file if missing', async () => {
            vol.fromNestedJSON({
                [basedir()]: {}
            });
            const entity = { prop1: 1, prop2: '2', prop3: undefined, prop4: 42 };
            const id = '42';

            await expect(getFilesystemStore(logger).write({ entityName: 'dummy', id, entity })).resolves.toEqual(
                entity
            );

            const dataFileFullPath = path.join(basedir(), 'dummies.json');
            expect(fs.existsSync(dataFileFullPath)).toBeTruthy();
            expect(JSON.parse(fs.readFileSync(dataFileFullPath).toString())).toEqual({
                dummies: { [id]: entity }
            });
        });

        it('will append to end of array if creating new entry', async () => {
            const existingEntities = {
                '1': { prop1: 41, prop2: '13' },
                '2': { prop1: 42, prop2: '1' },
                '3': { prop1: 42, prop2: '13', prop3: 1 },
                '4': { prop1: 42, prop2: '1', prop3: 2 }
            };
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: existingEntities
                })
            });
            const entity = { prop1: 1, prop2: 'prop2', prop3: 13 };
            const id = '42';

            await expect(getFilesystemStore(logger).write({ entityName: 'dummy', id, entity })).resolves.toEqual(
                entity
            );

            const dataFileFullPath = path.join(basedir(), 'dummies.json');
            expect(fs.existsSync(dataFileFullPath)).toBeTruthy();
            expect(JSON.parse(fs.readFileSync(dataFileFullPath).toString())).toEqual({
                dummies: { ...existingEntities, [id]: entity }
            });
        });

        it('will update an existing entry', async () => {
            const existingEntities = {
                '1': { prop1: 41, prop2: '13' },
                '2': { prop1: 42, prop2: '1' },
                '3': { prop1: 42, prop2: '13', prop3: 1 },
                '42': { prop1: 42, prop2: '1', prop3: 2 }
            };
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: existingEntities
                })
            });
            const entity = { prop1: 42, prop2: '13', prop3: 13 };
            const id = '42';

            await expect(getFilesystemStore(logger).write({ entityName: 'dummy', id, entity })).resolves.toEqual(
                entity
            );

            const dataFileFullPath = path.join(basedir(), 'dummies.json');
            expect(fs.existsSync(dataFileFullPath)).toBeTruthy();
            expect(JSON.parse(fs.readFileSync(dataFileFullPath).toString())).toEqual({
                dummies: {
                    ...Object.keys(existingEntities)
                        .filter((k) => k !== id)
                        .reduce((obj, k) => {
                            obj[k] = existingEntities[k];
                            return obj;
                        }, {}),
                    [id]: entity
                }
            });
        });
    });

    describe('del', () => {
        beforeEach(() => {
            vol.reset();
        });

        it.each(['', '  ', undefined])(
            'will return false when entity name is %p',
            async (entityName: string | undefined) => {
                await expect(getFilesystemStore(logger).del({ entityName, id: '42' })).resolves.toBeFalsy();
            }
        );

        it('will return false when fiori tools directory is missing', async () => {
            await expect(getFilesystemStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeFalsy();
        });

        it('will return false when entity file is missing', async () => {
            vol.fromNestedJSON({
                [basedir()]: {}
            });

            await expect(getFilesystemStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeFalsy();
        });

        it('will throw an error when entity file is corrupt', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: '{'
            });

            await expect(() => getFilesystemStore(logger).del({ entityName: 'dummy', id: '42' })).rejects.toThrow();
        });

        it('will return false when no entities exist', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({ dummies: {} })
            });

            await expect(getFilesystemStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeFalsy();
        });

        it('will return false when no entities match', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: {
                        '1': { prop1: 41, prop2: '13' },
                        '2': { prop1: 42, prop2: '1' }
                    }
                })
            });

            await expect(getFilesystemStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeFalsy();
        });

        it('will delete an existing entity, if found', async () => {
            const existingEntities = {
                '1': { prop1: 41, prop2: '13' },
                '2': { prop1: 42, prop2: '1' },
                '3': { prop1: 42, prop2: '13', prop3: 1 },
                '42': { prop1: 42, prop2: '1', prop3: 2 }
            };
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: existingEntities
                })
            });

            const id = '42';
            await expect(getFilesystemStore(logger).del({ entityName: 'dummy', id })).resolves.toBeTruthy();

            const dataFileFullPath = path.join(basedir(), 'dummies.json');
            expect(fs.existsSync(dataFileFullPath)).toBeTruthy();
            expect(JSON.parse(fs.readFileSync(dataFileFullPath).toString())).toEqual({
                dummies: {
                    ...Object.keys(existingEntities)
                        .filter((k) => k !== id)
                        .reduce((obj, k) => {
                            obj[k] = existingEntities[k];
                            return obj;
                        }, {})
                }
            });
        });
    });

    describe('partialUpdate', () => {
        beforeEach(() => {
            vol.reset();
        });
        it('should update the entity with the new properties', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: {
                        '41': { prop1: 41, prop2: '13' },
                        '13': { prop1: 42, prop2: '1' }
                    }
                })
            });

            await expect(
                getFilesystemStore(logger).partialUpdate({ entityName: 'dummy', id: '41', entity: { prop3: 'abc' } })
            ).resolves.toStrictEqual({
                prop1: 41,
                prop2: '13',
                prop3: 'abc'
            });
        });

        it('should update the existing properties on the chosen enitity', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: {
                        '41': { prop1: 41, prop2: '13' },
                        '13': { prop1: 42, prop2: '1' }
                    }
                })
            });
            await expect(
                getFilesystemStore(logger).partialUpdate({ entityName: 'dummy', id: '13', entity: { prop2: '2' } })
            ).resolves.toStrictEqual({
                prop1: 42,
                prop2: '2'
            });
        });

        test('should return undefined if the entity does not have properties', async () => {
            vol.fromNestedJSON({
                [path.join(basedir(), 'dummies.json')]: JSON.stringify({
                    dummies: {
                        '41': { prop1: 41, prop2: '13' },
                        '13': { prop1: 42, prop2: '1' }
                    }
                })
            });

            await expect(
                getFilesystemStore(logger).partialUpdate({ entityName: 'dummy', id: '42', entity: {} })
            ).resolves.toBeUndefined();
        });

        test('should return undefined when entity file is missing', async () => {
            vol.fromNestedJSON({
                [basedir()]: {}
            });

            await expect(
                getFilesystemStore(logger).partialUpdate({ entityName: 'dummy', id: '13', entity: { prop2: '2' } })
            ).resolves.toBeUndefined();
        });
    });
});

describe('getFilesystemWatcherFor', () => {
    beforeEach(() => {
        mockWatch.mockReturnValueOnce({} as FSWatcher);
        // Reset existsSync to use memfs default
        mockExistsSync.mockImplementation((...args: any[]) => (memfs.existsSync as any)(...args));
    });

    afterEach(() => {
        mockWatch.mockReset();
        mockExistsSync.mockImplementation((...args: any[]) => (memfs.existsSync as any)(...args));
        mockPathJoin.mockImplementation((...args: string[]) => actualPath.join(...args));
    });

    it('will return a watcher if a file for an entity exists', () => {
        const fileName = 'dummyentities.json';
        mockPathJoin.mockReturnValueOnce('/' + fileName);
        mockExistsSync.mockImplementation((fpath: any) => {
            return String(fpath).endsWith(fileName) ? true : false;
        });

        expect(getFilesystemWatcherFor('DummyEntity' as any, () => jest.fn())).toBeTruthy();
        expect(mockWatch).toHaveBeenCalledTimes(1);
    });

    it('will return undefined if a file for an entity does not exist', () => {
        const fileName = 'dummyentities.json';
        mockPathJoin.mockReturnValueOnce('/' + fileName);
        mockExistsSync.mockImplementation((fpath: any) => {
            return String(fpath).endsWith(fileName) ? false : false;
        });

        expect(getFilesystemWatcherFor('DummyEntity' as any, () => jest.fn())).toBeUndefined();
        expect(mockWatch).toHaveBeenCalledTimes(0);
    });
});
