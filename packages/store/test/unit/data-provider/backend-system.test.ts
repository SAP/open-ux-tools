import { BackendSystem, BackendSystemKey } from '../../../src';
import * as dataAccessHybrid from '../../../src/data-access/hybrid';
import { SystemDataProvider } from '../../../src/data-provider/backend-system';
import { Entities } from '../../../src/data-provider/constants';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

describe('Backend system data provider', () => {
    const mockGetHybridStore = jest.spyOn(dataAccessHybrid, 'getHybridStore');
    const mockHybridStore = {
        write: jest.fn(),
        read: jest.fn(),
        del: jest.fn(),
        getAll: jest.fn(),
        readAll: jest.fn(),
        partialUpdate: jest.fn()
    };

    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    beforeEach(() => {
        mockGetHybridStore.mockReturnValue(mockHybridStore);
        jest.clearAllMocks();
    });

    it('read delegates to the data accessor', async () => {
        const expectedSystem: BackendSystem = {
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        };
        mockHybridStore.read.mockResolvedValueOnce(expectedSystem);
        await expect(
            new SystemDataProvider(logger).read(new BackendSystemKey({ url: 'url', client: 'client' }))
        ).resolves.toBe(expectedSystem);
    });

    it('write delegates to the data accessor', async () => {
        const expectedSystem: BackendSystem = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        mockHybridStore.write.mockResolvedValueOnce(expectedSystem);
        await expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(
            expectedSystem
        );
        expect(mockHybridStore.write).toBeCalledWith({
            entityName: Entities.BackendSystem,
            id: BackendSystemKey.from(expectedSystem).getId(),
            entity: new BackendSystem(expectedSystem)
        });
    });

    it('write creates an object of the correct class (to init annotations)', async () => {
        const expectedSystem: BackendSystem = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        });
        mockHybridStore.write.mockResolvedValueOnce(expectedSystem);
        await expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(
            expectedSystem
        );
        expect(mockHybridStore.write).toBeCalledWith({
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
        mockHybridStore.del.mockResolvedValueOnce(true);
        await expect(new SystemDataProvider(logger).delete(new BackendSystem(expectedSystem))).resolves.toBe(true);
        expect(mockHybridStore.del).toBeCalledWith({
            entityName: Entities.BackendSystem,
            id: BackendSystemKey.from(expectedSystem).getId()
        });
    });

    it('getAll delegates to the data accessor', async () => {
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
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1, sys2, sys3 });
        await expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1, sys2, sys3]);
        expect(mockHybridStore.readAll).toBeCalledWith({
            entityName: Entities.BackendSystem,
            includeSensitiveData: true
        });
    });

    it('getAll culls systems with empty urls', async () => {
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
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1, sys2, sys3, sys4, sys5: undefined });
        await expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1]);
        expect(mockHybridStore.readAll).toBeCalledWith({
            entityName: Entities.BackendSystem,
            includeSensitiveData: true
        });
    });

    it('getAll performs necessary migration to add the system type', async () => {
        const sys1: BackendSystem = {
            name: 'sys1',
            url: 'url1'
        };
        const sys2: BackendSystem = {
            name: 'sys2',
            url: 'url2'
        };
        const sys3: BackendSystem = {
            name: 'sys3',
            url: 'url3'
        };

        mockHybridStore.readAll.mockResolvedValue({ sys1, sys2, sys3 });

        mockHybridStore.read
            .mockResolvedValueOnce({ ...sys1, authenticationType: 'reentranceTicket' })
            .mockResolvedValueOnce({ ...sys2, serviceKeys: '<serviceKey>' })
            .mockResolvedValueOnce({ ...sys3, username: 'username' });

        mockHybridStore.partialUpdate.mockResolvedValue(Promise.resolve());

        await expect(new SystemDataProvider(logger).getAll({ includeSensitiveData: false })).resolves.toEqual([
            sys1,
            sys2,
            sys3
        ]);

        expect(mockHybridStore.partialUpdate).toBeCalledTimes(3);
        expect(mockHybridStore.partialUpdate).toHaveBeenNthCalledWith(1, {
            entityName: Entities.BackendSystem,
            id: 'sys1',
            entity: { systemType: 'S4HC' }
        });
        expect(mockHybridStore.partialUpdate).toHaveBeenNthCalledWith(2, {
            entityName: Entities.BackendSystem,
            id: 'sys2',
            entity: { systemType: 'BTP' }
        });
        expect(mockHybridStore.partialUpdate).toHaveBeenNthCalledWith(3, {
            entityName: Entities.BackendSystem,
            id: 'sys3',
            entity: { systemType: 'OnPrem' }
        });

        expect(mockHybridStore.readAll).toBeCalledTimes(2);
        expect(mockHybridStore.readAll).toBeCalledWith({
            entityName: Entities.BackendSystem,
            includeSensitiveData: false
        });
    });
});
