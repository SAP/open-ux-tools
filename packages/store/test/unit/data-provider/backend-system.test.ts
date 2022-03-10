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
        readAll: jest.fn()
    };

    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    beforeEach(() => {
        jest.resetAllMocks();
        mockGetHybridStore.mockReturnValue(mockHybridStore);
    });

    it('read delegates to the data accessor', () => {
        const expectedSystem: BackendSystem = {
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass'
        };
        mockHybridStore.read.mockResolvedValueOnce(expectedSystem);
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
        mockHybridStore.write.mockResolvedValueOnce(expectedSystem);
        expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(expectedSystem);
        expect(mockHybridStore.write).toBeCalledWith({
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
        mockHybridStore.write.mockResolvedValueOnce(expectedSystem);
        expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(expectedSystem);
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
        expect(new SystemDataProvider(logger).delete(new BackendSystem(expectedSystem))).resolves.toBe(true);
        expect(mockHybridStore.del).toBeCalledWith({
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
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1, sys2, sys3 });
        expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1, sys2, sys3]);
        expect(mockHybridStore.readAll).toBeCalledWith({
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
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1, sys2, sys3, sys4, sys5: undefined });
        expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1]);
        expect(mockHybridStore.readAll).toBeCalledWith({
            entityName: Entities.BackendSystem
        });
    });
});
