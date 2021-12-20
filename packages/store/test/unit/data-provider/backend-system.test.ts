import { BackendSystem, BackendSystemKey } from '../../../src';
import { HybridStore } from '../../../src/data-access/hybrid';
import { SystemDataProvider } from '../../../src/data-provider/backend-system';
import { getExtendedLogger } from '../../../src/utils';
import { Entities } from '../../../src/data-provider/constants';

describe('Backend system data provider', () => {
    const logger = getExtendedLogger(console);
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('read delegates to the data accessor', () => {
        const expectedSystem: BackendSystem = {
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        };
        jest.spyOn(HybridStore.prototype, 'read').mockResolvedValueOnce(expectedSystem);
        expect(
            new SystemDataProvider(logger).read(new BackendSystemKey({ url: 'url', client: 'client' }))
        ).resolves.toBe(expectedSystem);
    });

    it('write delegates to the data accessor', () => {
        const expectedSystem: BackendSystem = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const mockHybridStore = jest.spyOn(HybridStore.prototype, 'write').mockResolvedValueOnce(expectedSystem);
        expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(expectedSystem);
        expect(mockHybridStore).toBeCalledWith({
            entityName: Entities.BackendSystem,
            id: BackendSystemKey.from(expectedSystem).getId(),
            entity: new BackendSystem(expectedSystem)
        });
    });

    it('write creates an object of the correct class (to init annotations)', () => {
        const expectedSystem: BackendSystem = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const mockHybridStore = jest.spyOn(HybridStore.prototype, 'write').mockResolvedValueOnce(expectedSystem);
        expect(new SystemDataProvider(logger).write(expectedSystem)).resolves.toBe(expectedSystem);
        expect(mockHybridStore).toBeCalledWith({
            entityName: Entities.BackendSystem,
            id: BackendSystemKey.from(expectedSystem).getId(),
            entity: new BackendSystem(expectedSystem)
        });
    });

    it('delete delegates to the data accessor', async () => {
        const expectedSystem: BackendSystem = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const mockHybridStore = jest.spyOn(HybridStore.prototype, 'del').mockResolvedValueOnce(true);
        expect(await new SystemDataProvider(logger).delete(new BackendSystem(expectedSystem))).toBe(true);
        expect(mockHybridStore).toBeCalledWith({
            entityName: Entities.BackendSystem,
            id: BackendSystemKey.from(expectedSystem).getId()
        });
    });

    it('getAll delegates to the data accessor', () => {
        const sys1: BackendSystem = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const sys2: BackendSystem = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const sys3: BackendSystem = Object.freeze({
            name: 'sys3',
            url: 'url3',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const mockHybridStore = jest
            .spyOn(HybridStore.prototype, 'readAll')
            .mockResolvedValueOnce({ sys1, sys2, sys3 });
        expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1, sys2, sys3]);
        expect(mockHybridStore).toBeCalledWith({
            entityName: Entities.BackendSystem
        });
    });

    it('getAll culls systems with empty urls', () => {
        const sys1: BackendSystem = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const sys2: BackendSystem = Object.freeze({
            name: 'sys2',
            url: '',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const sys3: BackendSystem = Object.freeze({
            name: 'sys3',
            url: '    ',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        const sys4: BackendSystem = Object.freeze({
            name: 'sys3',
            url: undefined,
            client: 'client',
            username: 'user',
            password: 'pass'
        }) as unknown as BackendSystem; // We want url to be undefined for the test
        const mockHybridStore = jest
            .spyOn(HybridStore.prototype, 'readAll')
            .mockResolvedValueOnce({ sys1, sys2, sys3, sys4, sys5: undefined });
        expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1]);
        expect(mockHybridStore).toBeCalledWith({
            entityName: Entities.BackendSystem
        });
    });
});
