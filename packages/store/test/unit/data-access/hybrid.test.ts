import 'jest-extended';
import { sensitiveData, serializable } from '../../../src/decorators';
import { getFilesystemStore } from '../../../src/data-access/filesystem';
import { mocked } from 'ts-jest/utils';
import { getSecureStore } from '../../../src/secure-store';
import { getHybridStore } from '../../../src/data-access/hybrid';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';

jest.mock('../../../src/data-access/filesystem');
const mockFileSystemAccess = mocked(getFilesystemStore);
const mockFilesystemStore = {
    write: jest.fn(),
    read: jest.fn(),
    del: jest.fn(),
    getAll: jest.fn(),
    readAll: jest.fn()
};
mockFileSystemAccess.mockReturnValue(mockFilesystemStore);

jest.mock('../../../src/secure-store');
const mockGetSecureStore = mocked(getSecureStore);
const mockSecureStore = {
    save: jest.fn(),
    retrieve: jest.fn(),
    'delete': jest.fn(),
    getAll: jest.fn()
};
mockGetSecureStore.mockReturnValue(mockSecureStore);

class HasOnlyOrdinaryProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    public toString(): string {
        return this.ordinaryProperty1 + this.ordinaryProperty2;
    }
}

class HasSerializableProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @serializable private readonly serializableProperty1 = '1';
    @serializable private readonly serializableProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 + this.ordinaryProperty2 + this.serializableProperty1 + this.serializableProperty2
        );
    }
}

class HasSensitiveDataProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @sensitiveData private readonly sensitiveDataProperty1 = '1';
    @sensitiveData private readonly sensitiveDataProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 + this.ordinaryProperty2 + this.sensitiveDataProperty1 + this.sensitiveDataProperty2
        );
    }
}

class HasSerializableAndSensitiveDataProps {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @sensitiveData private readonly sensitiveDataProperty1 = '1';
    @sensitiveData private readonly sensitiveDataProperty2 = '2';
    @serializable private readonly serializableProperty1 = '1';
    @serializable private readonly serializableProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 +
            this.ordinaryProperty2 +
            this.sensitiveDataProperty1 +
            this.sensitiveDataProperty2 +
            this.serializableProperty1 +
            this.serializableProperty2
        );
    }
}

class HasSerializableAndSensitiveDataPropsWithDupes {
    public readonly ordinaryProperty1 = '1';
    public readonly ordinaryProperty2 = '2';

    @sensitiveData
    @serializable
    private readonly sensitiveDataProperty1 = '1';
    @sensitiveData private readonly sensitiveDataProperty2 = '2';
    @serializable private readonly serializableProperty1 = '1';
    @serializable private readonly serializableProperty2 = '2';

    public toString(): string {
        return (
            this.ordinaryProperty1 +
            this.ordinaryProperty2 +
            this.sensitiveDataProperty1 +
            this.sensitiveDataProperty2 +
            this.serializableProperty1 +
            this.serializableProperty2
        );
    }
}

describe('hybrid store', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('read', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('returns properties from the filesystem', async () => {
            const propsInFS = { prop1: 42, prop2: '13' };
            mockFilesystemStore.read.mockResolvedValueOnce(propsInFS);
            mockSecureStore.retrieve = jest.fn().mockResolvedValueOnce(undefined);

            await expect(getHybridStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toEqual(propsInFS);
        });

        it('returns sensitive data from secure store', async () => {
            const sensitiveProps = { prop1: 42, prop2: '13' };
            mockFilesystemStore.read.mockResolvedValueOnce(undefined);
            mockSecureStore.retrieve = jest.fn().mockResolvedValueOnce(sensitiveProps);

            await expect(getHybridStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toEqual(
                sensitiveProps
            );
        });

        it('returns undefined when both stores cannot find the entity', async () => {
            mockFilesystemStore.read.mockResolvedValueOnce(undefined);
            mockSecureStore.retrieve = jest.fn().mockResolvedValueOnce(undefined);

            await expect(getHybridStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toBeUndefined();
        });

        it('combines data from filesystem and secure store', async () => {
            const propsInFS = { prop1: 42, prop2: '13' };
            mockFilesystemStore.read.mockResolvedValueOnce(propsInFS);
            const sensitiveProps = { prop3: 42, prop4: '13' };
            mockSecureStore.retrieve = jest.fn().mockResolvedValueOnce(sensitiveProps);

            await expect(getHybridStore(logger).read({ entityName: 'dummy', id: '42' })).resolves.toEqual({
                ...sensitiveProps,
                ...propsInFS
            });
        });
    });

    describe('hybrid store', () => {
        describe('getAll', () => {
            beforeEach(() => {
                jest.clearAllMocks();
            });

            it('returns entities from the filesystem', async () => {
                const fsEntities = {
                    '42': { prop1: 42, prop2: '13' },
                    '13': { prop1: 1, prop2: 'b' }
                };
                mockFilesystemStore.readAll.mockResolvedValueOnce(fsEntities);
                mockSecureStore.getAll.mockResolvedValueOnce(undefined);

                await expect(getHybridStore(logger).getAll({ entityName: 'dummy' })).resolves.toIncludeSameMembers(
                    Object.values(fsEntities)
                );
            });

            it('returns sensitive data from secure store', async () => {
                const entitiesInSecureStore = {
                    '42': { prop1: 42, prop2: '13' },
                    '13': { prop1: 1, prop2: 'b' }
                };
                mockFilesystemStore.readAll.mockResolvedValueOnce({});
                mockSecureStore.getAll.mockResolvedValueOnce(entitiesInSecureStore);

                await expect(getHybridStore(logger).getAll({ entityName: 'dummy' })).resolves.toIncludeSameMembers(
                    Object.values(entitiesInSecureStore)
                );
            });

            it('returns an empty object when both stores are empty', async () => {
                mockFilesystemStore.readAll.mockResolvedValueOnce(undefined);
                mockSecureStore.getAll.mockResolvedValueOnce(undefined);

                await expect(getHybridStore(logger).getAll({ entityName: 'dummy' })).resolves.toEqual([]);
            });

            it('combines data from filesystem and secure store (secure properties override if conflict)', async () => {
                const fsEntities = {
                    '42': { prop1: 42, prop2: '13' },
                    '13': { prop1: 1, prop2: 'b' },
                    onlyfs: { prop1: 1 }
                };
                const entitiesInSecureStore = {
                    '42': { prop3: 42 },
                    '13': { prop1: 'sensitive', prop3: 'b' },
                    onlysecure: { prop1: 1 }
                };
                mockFilesystemStore.readAll.mockResolvedValueOnce(fsEntities);
                mockSecureStore.getAll.mockResolvedValueOnce(entitiesInSecureStore);

                await expect(getHybridStore(logger).getAll({ entityName: 'dummy' })).resolves.toIncludeSameMembers([
                    /* 42 */ { prop1: 42, prop2: '13', prop3: 42 },
                    /* 13 */ { prop1: 'sensitive', prop2: 'b', prop3: 'b' },
                    /* onlyfs */ { prop1: 1 },
                    /* onlysecure */ { prop1: 1 }
                ]);
            });
        });
    });

    describe('write', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('writes serializable properties to file system', async () => {
            mockSecureStore.save = jest.fn();

            await getHybridStore(logger).write({ entityName: 'dummy', id: '42', entity: new HasOnlyOrdinaryProps() });
            expect(mockSecureStore.save).not.toBeCalled();
            expect(mockFilesystemStore.write).not.toBeCalled();
        });

        it('writes serializable properties to file system', async () => {
            mockSecureStore.save = jest.fn();

            await getHybridStore(logger).write({ entityName: 'dummy', id: '42', entity: new HasSerializableProps() });
            expect(mockSecureStore.save).not.toBeCalled();
            expect(mockFilesystemStore.write).toHaveBeenCalledWith(
                expect.objectContaining({
                    entity: {
                        serializableProperty1: '1',
                        serializableProperty2: '2'
                    }
                })
            );
        });

        it('writes sensitive data to secure store', async () => {
            mockSecureStore.save = jest.fn();

            await getHybridStore(logger).write({ entityName: 'dummy', id: '42', entity: new HasSensitiveDataProps() });
            expect(mockFilesystemStore.write).not.toBeCalled();
            expect(mockSecureStore.save).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
                sensitiveDataProperty1: '1',
                sensitiveDataProperty2: '2'
            });
        });

        it('writes serilizable props to filesystem & sensitive data to secure store', async () => {
            mockSecureStore.save = jest.fn();

            await getHybridStore(logger).write({
                entityName: 'dummy',
                id: '42',
                entity: new HasSerializableAndSensitiveDataProps()
            });
            expect(mockFilesystemStore.write).toHaveBeenCalledWith(
                expect.objectContaining({
                    entity: {
                        serializableProperty1: '1',
                        serializableProperty2: '2'
                    }
                })
            );
            expect(mockSecureStore.save).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
                sensitiveDataProperty1: '1',
                sensitiveDataProperty2: '2'
            });
        });

        it('sensitive information is only stored in secure store (even if marked serialized)', async () => {
            mockSecureStore.save = jest.fn();

            await getHybridStore(logger).write({
                entityName: 'dummy',
                id: '42',
                entity: new HasSerializableAndSensitiveDataPropsWithDupes()
            });
            expect(mockFilesystemStore.write).toHaveBeenCalledWith(
                expect.objectContaining({
                    entity: {
                        serializableProperty1: '1',
                        serializableProperty2: '2'
                    }
                })
            );
            expect(mockSecureStore.save).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
                sensitiveDataProperty1: '1',
                sensitiveDataProperty2: '2'
            });
        });
    });

    describe('del', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('deletes properties from the filesystem', async () => {
            mockFilesystemStore.del.mockResolvedValueOnce(true);
            mockSecureStore.delete = jest.fn().mockResolvedValueOnce(false);

            await expect(getHybridStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeTrue();
        });

        it('deletes sensitive data from secure store', async () => {
            mockFilesystemStore.del.mockResolvedValueOnce(false);
            mockSecureStore.delete = jest.fn().mockResolvedValueOnce(true);

            await expect(getHybridStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeTrue();
        });

        it('deletes data from filesystem and secure store', async () => {
            mockFilesystemStore.del.mockResolvedValueOnce(true);
            mockSecureStore.delete = jest.fn().mockResolvedValueOnce(true);
            await expect(getHybridStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeTrue();
        });

        it('returns false if there is nothing to delete', async () => {
            mockFilesystemStore.del.mockResolvedValueOnce(false);
            mockSecureStore.delete = jest.fn().mockResolvedValueOnce(false);
            await expect(getHybridStore(logger).del({ entityName: 'dummy', id: '42' })).resolves.toBeFalse();
        });
    });
});
