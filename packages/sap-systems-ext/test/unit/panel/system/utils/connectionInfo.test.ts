import type { BackendSystem } from '@sap-ux/store';
import { ODataVersion, type ODataServiceInfo } from '@sap-ux/axios-extension';
import { getCatalogServiceCount, getSystemInfo, hasServiceMetadata } from '../../../../../src/panel/system/utils';

const listServicesMock = jest.fn();

const catalogServiceMock = jest.fn().mockImplementation(() => ({
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    listServices: listServicesMock
}));

const getSystemInfoMock = jest.fn();
const metadataMock = jest.fn();
const serviceMock = jest.fn().mockImplementation(() => ({
    metadata: metadataMock
}));

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    createForAbap: jest.fn().mockImplementation(({ refreshTokenChangedCb }) => ({
        catalog: catalogServiceMock,
        getSystemInfo: getSystemInfoMock,
        service: serviceMock
    })),
    createForAbapOnCloud: jest.fn().mockImplementation(({ refreshTokenChangedCb }) => ({
        catalog: catalogServiceMock,
        service: serviceMock
    }))
}));

describe('getCatalogServiceCount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const v2OdataServices = [
        { name: 'A_CatalogService_V2', id: 'A_CAT_V2', odataVersion: ODataVersion.v2 },
        { name: 'B_CatalogService_V2', id: 'B_CAT_V2', odataVersion: ODataVersion.v2 },
        { name: 'C_CatalogService_V2', id: 'C_CAT_V2', odataVersion: ODataVersion.v2 }
    ] as ODataServiceInfo[];

    const v4OdataServices = [
        { name: 'A_CatalogService_V4', id: 'A_CAT_V4', odataVersion: ODataVersion.v4 },
        { name: 'B_CatalogService_V4', id: 'B_CAT_V4', odataVersion: ODataVersion.v4 }
    ] as ODataServiceInfo[];

    it('should get catalog service count for an on premise system ', async () => {
        listServicesMock.mockResolvedValueOnce(v2OdataServices).mockResolvedValueOnce(v4OdataServices);

        const system: BackendSystem = {
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'abap_catalog'
        };
        const counts = await getCatalogServiceCount(system);
        expect(counts).toEqual({ v2Request: { count: 3 }, v4Request: { count: 2 } });
    });

    it('should get catalog service count for a cloud system ', async () => {
        const v4Error = new Error('V4 catalog not available');
        listServicesMock.mockResolvedValueOnce(v2OdataServices).mockImplementationOnce(() => {
            throw v4Error;
        });

        const system: BackendSystem = {
            url: 'https://example.com',
            name: 'Test System',
            systemType: 'AbapCloud',
            authenticationType: 'oauth2',
            connectionType: 'abap_catalog'
        };
        const counts = await getCatalogServiceCount(system);
        expect(counts).toEqual({ v2Request: { count: 3 }, v4Request: { count: undefined, error: v4Error } });
    });
});

describe('getSystemInfo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should retrieve system info successfully', async () => {
        const mockSystemInfo = { systemID: 'SYS123', client: '100' };
        getSystemInfoMock.mockResolvedValue(mockSystemInfo);

        const system: BackendSystem = {
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'abap_catalog'
        };

        const result = await getSystemInfo(system);
        expect(result).toEqual({ systemId: 'SYS123', client: '100' });
    });

    it('should return undefined if system info is not available', async () => {
        getSystemInfoMock.mockResolvedValue(undefined);

        const system: BackendSystem = {
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'abap_catalog'
        };

        const result = await getSystemInfo(system);
        expect(result).toBeUndefined();
    });

    it('should handle errors when retrieving system info', async () => {
        const mockError = new Error('Failed to retrieve system info');
        getSystemInfoMock.mockRejectedValue(mockError);

        const system: BackendSystem = {
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'abap_catalog'
        };

        const result = await getSystemInfo(system);
        expect(result).toBeUndefined();
    });
});

describe('hasServiceMetadata', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when service metadata is available', async () => {
        const mockMetadata = '<edmx:Edmx Version="1.0"></edmx:Edmx>';
        metadataMock.mockResolvedValue(mockMetadata);

        const system: BackendSystem = {
            url: 'https://example.com/sap/opu/odata/sap/SERVICE',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        };

        const result = await hasServiceMetadata(system);
        expect(result).toBe(true);
        expect(serviceMock).toHaveBeenCalledWith('/sap/opu/odata/sap/SERVICE/');
        expect(metadataMock).toHaveBeenCalled();
    });

    it('should return false when service metadata is not available', async () => {
        metadataMock.mockResolvedValue(undefined);

        const system: BackendSystem = {
            url: 'https://example.com/sap/opu/odata/sap/SERVICE',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        };

        const result = await hasServiceMetadata(system);
        expect(result).toBe(false);
    });

    it('should add trailing slash to path if not present', async () => {
        const mockMetadata = '<edmx:Edmx Version="1.0"></edmx:Edmx>';
        metadataMock.mockResolvedValue(mockMetadata);

        const system: BackendSystem = {
            url: 'https://example.com/sap/opu/odata/sap/SERVICE',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        };

        await hasServiceMetadata(system);
        expect(serviceMock).toHaveBeenCalledWith('/sap/opu/odata/sap/SERVICE/');
    });

    it('should not add additional trailing slash if already present', async () => {
        const mockMetadata = '<edmx:Edmx Version="1.0"></edmx:Edmx>';
        metadataMock.mockResolvedValue(mockMetadata);

        const system: BackendSystem = {
            url: 'https://example.com/sap/opu/odata/sap/SERVICE/',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        };

        await hasServiceMetadata(system);
        expect(serviceMock).toHaveBeenCalledWith('/sap/opu/odata/sap/SERVICE/');
    });

    it('should handle errors when retrieving metadata', async () => {
        const mockError = new Error('Metadata retrieval failed');
        metadataMock.mockRejectedValue(mockError);

        const system: BackendSystem = {
            url: 'https://example.com/sap/opu/odata/sap/SERVICE',
            name: 'Test System',
            systemType: 'OnPrem',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        };

        await expect(hasServiceMetadata(system)).rejects.toThrow('Metadata retrieval failed');
    });

    it('should work with AbapCloud systems', async () => {
        const mockMetadata = '<edmx:Edmx Version="1.0"></edmx:Edmx>';
        metadataMock.mockResolvedValue(mockMetadata);

        const system: BackendSystem = {
            url: 'https://example.com/sap/opu/odata/sap/SERVICE',
            name: 'Test Cloud System',
            systemType: 'AbapCloud',
            authenticationType: 'oauth2',
            connectionType: 'odata_service'
        };

        const result = await hasServiceMetadata(system);
        expect(result).toBe(true);
        expect(serviceMock).toHaveBeenCalledWith('/sap/opu/odata/sap/SERVICE/');
    });
});
