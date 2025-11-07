import type { BackendSystem } from '@sap-ux/store';
import { ODataVersion, type ODataServiceInfo } from '@sap-ux/axios-extension';
import { getCatalogServiceCount } from '../../../../../src/panel/system/utils';

const listServicesMock = jest.fn();

const catalogServiceMock = jest.fn().mockImplementation(() => ({
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    listServices: listServicesMock
}));

jest.mock('@sap-ux/axios-extension', () => ({
    ...jest.requireActual('@sap-ux/axios-extension'),
    createForAbap: jest.fn().mockImplementation(({ refreshTokenChangedCb }) => ({
        catalog: catalogServiceMock
    })),
    createForAbapOnCloud: jest.fn().mockImplementation(({ refreshTokenChangedCb }) => ({
        catalog: catalogServiceMock
    }))
}));

describe('Test catalog utils', () => {
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
            password: 'password'
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
            systemType: 'AbapCloud'
        };
        const counts = await getCatalogServiceCount(system);
        expect(counts).toEqual({ v2Request: { count: 3 }, v4Request: { count: undefined, error: v4Error } });
    });
});
