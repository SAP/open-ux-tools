import 'jest-extended';
import { vol } from 'memfs';
import { basedir, getFilesystemStore, getFilesystemWatcherFor } from '../../../src/data-access/filesystem';
import path from 'path';
import type { FSWatcher } from 'fs';
import fs from 'fs';
import { mocked } from 'ts-jest/utils';
import type { Entity } from '../../../src';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';

jest.mock('fs', () => {
    return require('memfs');
});

jest.mock('os', () => {
    return {
        ...(jest.requireActual('os') as object),
        homedir: jest.fn().mockReturnValue('/')
    };
});

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
            const mockFs = mocked(fs, true);
            const originalFn = mockFs.writeFileSync;
            mockFs.writeFileSync = jest.fn().mockImplementationOnce(() => {
                throw new Error();
            });

            await expect(() =>
                getFilesystemStore(logger).write({ entityName: 'dummy', id: '42', entity })
            ).rejects.toThrow();

            mockFs.writeFileSync = originalFn;
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
});

describe('getFilesystemWatcherFor', () => {
    let mockWatcher;
    beforeEach(() => {
        mockWatcher = jest.spyOn(fs, 'watch').mockReturnValueOnce({} as FSWatcher);
    });

    afterEach(() => {
        mockWatcher.mockReset();
        mockWatcher.mockRestore();
    });

    it('will return a watcher if a file for an entity exists', () => {
        const fileName = 'dummyentities.json';
        jest.spyOn(path, 'join').mockReturnValueOnce('/' + fileName);
        jest.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
            return path.endsWith(fileName) ? true : jest.requireActual('fs').existsSync(path);
        });

        expect(getFilesystemWatcherFor('DummyEntity' as Entity, () => jest.fn())).toBeTruthy();
        expect(mockWatcher).toBeCalledTimes(1);
    });

    it('will return undefined if a file for an entity does not exist', () => {
        const fileName = 'dummyentities.json';
        jest.spyOn(path, 'join').mockReturnValueOnce('/' + fileName);
        jest.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
            return path.endsWith(fileName) ? false : jest.requireActual('fs').existsSync(path);
        });

        expect(getFilesystemWatcherFor('DummyEntity' as Entity, () => jest.fn())).toBeUndefined();
        expect(mockWatcher).toBeCalledTimes(0);
    });
});
