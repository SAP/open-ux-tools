import { jest } from '@jest/globals';
import type { BackendSystem as BackendSystemType } from '../../../src/index.js';

const mockHybridStore = {
    write: jest.fn(),
    read: jest.fn(),
    del: jest.fn(),
    getAll: jest.fn(),
    readAll: jest.fn(),
    partialUpdate: jest.fn()
};

const mockFilesystemStore = {
    write: jest.fn()
};

jest.unstable_mockModule('../../../src/data-access/hybrid', () => ({
    getHybridStore: jest.fn().mockReturnValue(mockHybridStore)
}));

jest.unstable_mockModule('../../../src/data-access/filesystem', () => ({
    getFilesystemStore: jest.fn().mockReturnValue(mockFilesystemStore),
    basedir: jest.fn(),
    getFilesystemWatcherFor: jest.fn()
}));

const mockExistsSync = jest.fn<(path: string) => boolean>();
const mockReadFileSync = jest.fn<typeof actualFs.readFileSync>();
const mockWriteFileSync = jest.fn<typeof actualFs.writeFileSync>();

// Import actual fs BEFORE mocking to avoid infinite resolution loops
const actualFs = await import('node:fs');

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: actualFs.default,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync
}));

const { BackendSystem, BackendSystemKey, SystemType } = await import('../../../src/index.js');
const { SystemDataProvider } = await import('../../../src/data-provider/backend-system.js');
const { Entities } = await import('../../../src/data-provider/constants.js');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('Backend system data provider', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('read delegates to the data accessor', async () => {
        const expectedSystem: BackendSystemType = {
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
        const expectedSystem: BackendSystemType = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass',
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'ID123', client: '999' }
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
        const expectedSystem: BackendSystemType = Object.freeze({
            name: 'sys',
            url: 'url',
            client: 'client',
            username: 'user',
            password: 'pass',
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'ID123', client: '999' }
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
        const expectedSystem: BackendSystemType = Object.freeze({
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
        mockExistsSync.mockReturnValueOnce(true);
        mockReadFileSync.mockReturnValueOnce(JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() }));
        const sys1: BackendSystemType = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys2: BackendSystemType = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys3: BackendSystemType = Object.freeze({
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
        mockExistsSync.mockReturnValueOnce(true);
        mockReadFileSync.mockReturnValueOnce(JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() }));
        const sys1: BackendSystemType = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys2: BackendSystemType = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys3: BackendSystemType = Object.freeze({
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

    it('getAll returns only the relevant abap_catalog connectionType systems by default', async () => {
        mockExistsSync.mockReturnValueOnce(true);
        mockReadFileSync.mockReturnValueOnce(JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() }));
        const sys1: BackendSystemType = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys2: BackendSystemType = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'odata_service'
        });
        const sys3: BackendSystemType = Object.freeze({
            name: 'sys3',
            url: 'url3',
            client: 'client',
            hasSensitiveData: true,
            systemType: SystemType.AbapCloud,
            connectionType: 'abap_catalog'
        });
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1: sys1, sys2: sys2, sys3: sys3 });
        await expect(new SystemDataProvider(logger).getAll()).resolves.toEqual([sys1, sys3]);
    });

    it('getAll returns the systems based on the array of connection types provided', async () => {
        mockExistsSync.mockReturnValueOnce(true);
        mockReadFileSync.mockReturnValueOnce(JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() }));
        const sys1: BackendSystemType = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });
        const sys2: BackendSystemType = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'odata_service'
        });
        const sys3: BackendSystemType = Object.freeze({
            name: 'sys3',
            url: 'url3',
            client: 'client',
            hasSensitiveData: true,
            systemType: SystemType.AbapCloud,
            connectionType: 'abap_catalog'
        });
        const sys4: BackendSystemType = Object.freeze({
            name: 'sys4',
            url: 'url4',
            hasSensitiveData: false,
            systemType: SystemType.Generic,
            connectionType: 'generic_host'
        });
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1: sys1, sys2: sys2, sys3: sys3, sys4: sys4 });
        await expect(
            new SystemDataProvider(logger).getAll({
                backendSystemFilter: { connectionType: ['abap_catalog', 'odata_service'] }
            })
        ).resolves.toEqual([sys1, sys2, sys3]);
    });

    it('getAll returns only backend systems matching the systemId/client', async () => {
        mockExistsSync.mockReturnValueOnce(true);
        mockReadFileSync.mockReturnValueOnce(JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() }));
        const sys1: BackendSystemType = Object.freeze({
            name: 'sys1',
            url: 'url1',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'ID123', client: '999' }
        });
        const sys2: BackendSystemType = Object.freeze({
            name: 'sys2',
            url: 'url2',
            client: 'client',
            username: 'user',
            password: 'pass',
            hasSensitiveData: true,
            systemType: SystemType.AbapOnPrem,
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'ID456', client: '000' }
        });
        const sys3: BackendSystemType = Object.freeze({
            name: 'sys3',
            url: 'url3',
            client: 'client',
            hasSensitiveData: true,
            systemType: SystemType.AbapCloud,
            connectionType: 'abap_catalog',
            systemInfo: { systemId: 'ID123', client: '999' }
        });
        mockHybridStore.readAll.mockResolvedValueOnce({ sys1: sys1, sys2: sys2, sys3: sys3 });
        await expect(
            new SystemDataProvider(logger).getAll({
                backendSystemFilter: { systemInfo: { systemId: 'ID123', client: '999' } }
            })
        ).resolves.toEqual([sys1, sys3]);
    });

    it('getAll performs necessary migration to add hasSensitveData', async () => {
        mockExistsSync.mockReturnValueOnce(false);
        const sys1: BackendSystemType = {
            name: 'sys1',
            url: 'url1',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        };
        const sys2: BackendSystemType = {
            name: 'sys2',
            url: 'url2',
            serviceKeys: '<serviceKey>',
            systemType: 'AbapCloud',
            connectionType: 'abap_catalog'
        };
        const sys3: BackendSystemType = {
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
        mockExistsSync.mockReturnValueOnce(false);
        const sys1: BackendSystemType = {
            name: 'sys1',
            url: 'url1',
            systemType: 'OnPrem',
            connectionType: 'abap_catalog'
        };
        const sys2: BackendSystemType = {
            name: 'sys2',
            url: 'url2',
            serviceKeys: '<serviceKey>',
            systemType: 'AbapCloud',
            connectionType: 'abap_catalog'
        };
        const sys3: BackendSystemType = {
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

    describe('ADT destinations merge and write routing', () => {
        const MIGRATION_MARKER = JSON.stringify({ backendSystemMigrationV1: new Date().toISOString() });
        const ADT_FILE = JSON.stringify({
            formatVersion: '1.0',
            destinations: [
                {
                    id: 'CLOUD',
                    protocol: 'http',
                    properties: { authenticationKind: 'reentranceticket', systemUrl: 'https://app.example.com:44301' }
                }
            ]
        });

        // The provider reads the migration marker first, then the ADT destinations file.
        const mockFsReads = (): void => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockImplementation((path: unknown) =>
                String(path).endsWith('destinations.json') ? ADT_FILE : MIGRATION_MARKER
            );
        };

        it('getAll merges ADT http destinations as ABAP-on-BTP systems', async () => {
            mockFsReads();
            mockHybridStore.readAll.mockResolvedValue({});
            const provider = new SystemDataProvider(logger);

            const systems = await provider.getAll();

            const cloud = systems.find((s) => s.name === 'CLOUD');
            expect(cloud).toMatchObject({
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapCloud,
                source: 'adt'
            });
        });

        it('write routes an ADT-owned system to destinations.json, not the hybrid store', async () => {
            mockFsReads();
            const provider = new SystemDataProvider(logger);
            const adtSystem = new BackendSystem({
                name: 'CLOUD',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapCloud,
                connectionType: 'abap_catalog',
                source: 'adt'
            });

            await provider.write(adtSystem);

            expect(mockWriteFileSync).toHaveBeenCalled();
            expect(String(mockWriteFileSync.mock.calls[0][0])).toContain('destinations.json');
            expect(mockHybridStore.write).not.toHaveBeenCalled();
        });

        it('delete routes an ADT-owned system to destinations.json, not the hybrid store', async () => {
            mockFsReads();
            const provider = new SystemDataProvider(logger);
            const adtSystem = new BackendSystem({
                name: 'CLOUD',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapCloud,
                connectionType: 'abap_catalog',
                source: 'adt'
            });

            await provider.delete(adtSystem);

            expect(mockWriteFileSync).toHaveBeenCalled();
            expect(mockHybridStore.del).not.toHaveBeenCalled();
        });

        it('write routes a non-ADT system to the hybrid store', async () => {
            mockExistsSync.mockReturnValue(false); // no ADT file
            const provider = new SystemDataProvider(logger);
            const system = new BackendSystem({
                name: 'onprem',
                url: 'https://onprem.example.com',
                systemType: SystemType.AbapOnPrem,
                connectionType: 'abap_catalog'
            });

            await provider.write(system);

            expect(mockHybridStore.write).toHaveBeenCalled();
        });

        it('does NOT route to destinations.json when a stored system exists for a colliding id (no data loss)', async () => {
            mockFsReads();
            // A genuine stored system exists at the same id as the ADT destination.
            mockHybridStore.read.mockResolvedValue({
                name: 'stored',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapOnPrem,
                connectionType: 'abap_catalog'
            });
            const provider = new SystemDataProvider(logger);
            // Note: no `source` marker — id collides with the ADT destination but this is a real system.
            const system = new BackendSystem({
                name: 'stored',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapOnPrem,
                connectionType: 'abap_catalog'
            });

            await provider.write(system);

            expect(mockHybridStore.write).toHaveBeenCalled();
            expect(mockWriteFileSync).not.toHaveBeenCalled(); // never written to destinations.json
        });

        it('read prefers the stored system over an ADT destination on id collision', async () => {
            mockFsReads();
            mockHybridStore.read.mockResolvedValue({
                name: 'stored',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapOnPrem,
                connectionType: 'abap_catalog'
            });
            const provider = new SystemDataProvider(logger);

            const result = await provider.read(new BackendSystemKey({ url: 'https://app.example.com:44301' }));

            expect(result?.name).toBe('stored');
            expect((result as { source?: string })?.source).toBeUndefined();
        });

        it('read falls back to the ADT destination when no stored system exists', async () => {
            mockFsReads();
            mockHybridStore.read.mockResolvedValue(undefined);
            const provider = new SystemDataProvider(logger);

            const result = await provider.read(new BackendSystemKey({ url: 'https://app.example.com:44301' }));

            expect(result?.source).toBe('adt');
        });
    });
});
