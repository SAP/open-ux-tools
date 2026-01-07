import { BackendSystem, BackendSystemKey, SystemType } from '../../../src';
import * as dataAccessHybrid from '../../../src/data-access/hybrid';
import * as fileSystemAccess from '../../../src/data-access/filesystem';
import { SystemDataProvider } from '../../../src/data-provider/backend-system';
import { Entities } from '../../../src/data-provider/constants';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import * as fs from 'node:fs';

jest.mock('fs');

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
    const mockGetFilesystemStore = jest.spyOn(fileSystemAccess, 'getFilesystemStore');
    const mockFilesystemStore = {
        write: jest.fn()
    };

    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    beforeEach(() => {
        mockGetHybridStore.mockReturnValue(mockHybridStore);
        mockGetFilesystemStore.mockReturnValue(
            mockFilesystemStore as unknown as ReturnType<typeof fileSystemAccess.getFilesystemStore>
        );
        jest.clearAllMocks();
    });

    it('read delegates to the data accessor', async () => {
        const expectedSystem: BackendSystem = {
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass',
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
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
            password: 'pass',
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        mockHybridStore.write.mockResolvedValueOnce(expectedSystem);
        await expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(
            expectedSystem
        );
        expect(mockHybridStore.write).toHaveBeenCalledWith({
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
            password: 'pass',
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        mockHybridStore.write.mockResolvedValueOnce(expectedSystem);
        await expect(new SystemDataProvider(logger).write(new BackendSystem(expectedSystem))).resolves.toBe(
            expectedSystem
        );
        expect(mockHybridStore.write).toHaveBeenCalledWith({
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
            password: 'pass',
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        mockHybridStore.del.mockResolvedValueOnce(true);
        await expect(new SystemDataProvider(logger).delete(new BackendSystem(expectedSystem))).resolves.toBe(true);
        expect(mockHybridStore.del).toHaveBeenCalledWith({
            entityName: Entities.BackendSystem,
            id: BackendSystemKey.from(expectedSystem).getId()
        });
    });

    it('getAll delegates to the data accessor', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
        jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
            return JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() });
        });
        const sys1: BackendSystem = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys2: BackendSystem = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys3: BackendSystem = Object.freeze({
            name: 'sys3',
            url: 'url3',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1: sys1, sys2: sys2, sys3: sys3 });
        await expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1, sys2, sys3]);
        expect(mockHybridStore.readAll).toHaveBeenCalledWith({
            entityName: Entities.BackendSystem,
            includeSensitiveData: true
        });
    });

    it('getAll returns only the relevant system types', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => true);
        jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
            return JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() });
        });
        const sys1: BackendSystem = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys2: BackendSystem = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys3: BackendSystem = Object.freeze({
            name: 'sys3',
            url: 'url3',
            client: 'client',
            hasSensitiveData: true,
            systemType: SystemType.AbapCloud,
            connectionType: 'abap_catalog'
        });
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1: sys1, sys2: sys2, sys3: sys3 });
        await expect(
            new SystemDataProvider(logger).getAll({ backendSystemFilter: { systemType: SystemType.AbapOnPrem } })
        ).resolves.toEqual([sys1, sys2]);
    });

    it('getAll performs necessary migration to add hasSensitveData', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
        const sys1: BackendSystem = {
            name: 'sys1',
            url: 'url1',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        };
        const sys2: BackendSystem = {
            name: 'sys2',
            url: 'url2',
            serviceKeys: '<serviceKey>',
            systemType: 'AbapCloud',
            connectionType: 'abap_catalog'
        };
        const sys3: BackendSystem = {
            name: 'sys3',
            url: 'url3',
            username: 'username',
            password: 'password',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        };

        mockHybridStore.readAll
            .mockResolvedValueOnce({ 'sys1': sys1, 'sys2': sys2, 'sys3': sys3 })
            .mockResolvedValueOnce({
                sys1: new BackendSystem(sys1),
                sys2: new BackendSystem(sys2),
                sys3: new BackendSystem(sys3)
            });

        mockHybridStore.write.mockResolvedValue(Promise.resolve());
        mockHybridStore.del.mockResolvedValue(Promise.resolve());

        await expect(new SystemDataProvider(logger).getAll({ includeSensitiveData: true })).resolves.toEqual([
            { ...sys1, hasSensitiveData: false },
            { ...sys2, hasSensitiveData: true },
            { ...sys3, hasSensitiveData: true }
        ]);

        expect(mockHybridStore.readAll).toHaveBeenCalledTimes(2);
        expect(mockHybridStore.readAll).toHaveBeenCalledWith({
            entityName: Entities.BackendSystem,
            includeSensitiveData: true
        });
    });

    it('getAll does not crash which migration fails ', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => false);
        const sys1: BackendSystem = {
            name: 'sys1',
            url: 'url1',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        };
        const sys2: BackendSystem = {
            name: 'sys2',
            url: 'url2',
            serviceKeys: '<serviceKey>',
            systemType: 'AbapCloud',
            connectionType: 'abap_catalog'
        };
        const sys3: BackendSystem = {
            name: 'sys3',
            url: 'url3',
            username: 'username',
            password: 'password',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        };

        mockHybridStore.readAll
            .mockResolvedValueOnce({ 'url1': sys1, 'url2': sys2, 'sys3': sys3 })
            .mockResolvedValueOnce({
                sys1: new BackendSystem(sys1),
                sys2: new BackendSystem(sys2),
                sys3: new BackendSystem(sys3)
            });

        mockHybridStore.write.mockResolvedValue(Promise.resolve());
        mockHybridStore.del.mockImplementationOnce(() => {
            throw new Error('Simulated failure');
        });
        await expect(new SystemDataProvider(logger).getAll({ includeSensitiveData: true })).resolves.toEqual([
            { ...sys1, hasSensitiveData: false },
            { ...sys2, hasSensitiveData: true },
            { ...sys3, hasSensitiveData: true }
        ]);

        expect(mockHybridStore.readAll).toHaveBeenCalledTimes(2);
        expect(mockHybridStore.readAll).toHaveBeenCalledWith({
            entityName: Entities.BackendSystem,
            includeSensitiveData: true
        });
    });
});
