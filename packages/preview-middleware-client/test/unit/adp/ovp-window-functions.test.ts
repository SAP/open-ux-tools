import { fetchMock, documentMock } from 'mock/window';
import ODataModelMock from 'mock/sap/ui/model/odata/v2/ODataModel';
import { initOvpWindowFunctions } from '../../../src/adp/ovp-window-functions';

const mockEntityContainer = { namespace: 'NS', entitySet: [{ name: 'TestSet', entityType: 'NS.TestType' }] };
const mockSchema = [{ namespace: 'NS', entityType: [{ name: 'TestType' }] }];

const mockMetaModel = {
    loaded: jest.fn().mockResolvedValue(undefined),
    getODataEntityContainer: jest.fn().mockReturnValue(mockEntityContainer),
    getObject: jest.fn().mockReturnValue(mockSchema)
};

(ODataModelMock as jest.Mock).mockImplementation(() => ({
    getMetaModel: jest.fn().mockReturnValue(mockMetaModel)
}));

describe('OVP Bridge Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        documentMock.getElementById.mockReturnValue(null);
        (ODataModelMock as jest.Mock).mockClear();
        mockMetaModel.loaded.mockResolvedValue(undefined);
        delete (window as any).writeToI18n;
        delete (window as any).getNewDataSources;
        delete (window as any).getMetaModelForNewDataSource;
    });

    afterEach(() => {
        fetchMock.mockRestore();
    });

    test('initOvpWindowFunctions registers all three functions on window', () => {
        initOvpWindowFunctions();
        expect(window.writeToI18n).toBeDefined();
        expect(window.getNewDataSources).toBeDefined();
        expect(window.getMetaModelForNewDataSource).toBeDefined();
    });

    describe('writeToI18n', () => {
        test('sends POST request to /editor/i18n with mapped properties', () => {
            fetchMock.mockResolvedValue({ ok: true });
            initOvpWindowFunctions();

            const properties = [
                { key: 'card.title', value: 'My Card', textType: 'XTIT' },
                { key: 'card.subtitle', value: 'Subtitle', textType: 'XFLD' }
            ];
            window.writeToI18n('/app/webapp/i18n', properties);

            expect(fetchMock).toHaveBeenCalledWith(
                '/editor/i18n',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify([
                        { key: 'card.title', value: 'My Card', annotation: 'XTIT' },
                        { key: 'card.subtitle', value: 'Subtitle', annotation: 'XFLD' }
                    ])
                })
            );
        });

        test('uses baseUrl from root element dataset', () => {
            documentMock.getElementById.mockImplementation((id: string) => {
                if (id === 'root') {
                    return { dataset: { openUxPreviewBaseUrl: '/my-base' } };
                }
                return null;
            });
            fetchMock.mockResolvedValue({ ok: true });
            initOvpWindowFunctions();

            window.writeToI18n('/path', [{ key: 'k', value: 'v' }]);
            expect(fetchMock).toHaveBeenCalledWith('/my-base/editor/i18n', expect.anything());
        });

        test('does not throw on fetch failure', () => {
            fetchMock.mockRejectedValue(new Error('Network error'));
            initOvpWindowFunctions();

            expect(() => {
                window.writeToI18n('/path', [{ key: 'k', value: 'v' }]);
            }).not.toThrow();
        });
    });

    describe('getNewDataSources', () => {
        test('sends GET request and returns parsed JSON', async () => {
            const mockResponse = { results: [{ ID: 'SRV_001', Title: 'TEST' }] };
            fetchMock.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });
            initOvpWindowFunctions();

            const result = await window.getNewDataSources('appId');
            expect(fetchMock).toHaveBeenCalledWith('/adp/api/ovp/datasources');
            expect(result).toEqual(mockResponse);
        });

        test('throws on non-ok response', async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 500 });
            initOvpWindowFunctions();

            await expect(window.getNewDataSources('appId')).rejects.toThrow('Failed to fetch data sources: 500');
        });
    });

    describe('getMetaModelForNewDataSource', () => {
        const mockServiceInfo = {
            serviceUrl: '/sap/opu/odata/sap/TEST_SRV/',
            annotations: [{ TechnicalName: 'TEST_ANNO', Uri: '/sap/annotation/$value' }],
            modelInformation: {
                serviceURI: '/sap/opu/odata/sap/TEST_SRV',
                serviceAnnotation: 'TEST_ANNO',
                serviceAnnotationURI: '/sap/annotation/$value'
            }
        };

        test('creates ODataModel with annotation URIs and returns metamodel', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockServiceInfo)
            });
            initOvpWindowFunctions();

            const dataSources = [
                { ID: 'SRV_001', Title: 'TEST_SERVICE' },
                { ID: 'SRV_002', Title: 'OTHER' }
            ];
            const result = await window.getMetaModelForNewDataSource(dataSources, 'appId');

            expect(fetchMock).toHaveBeenCalledWith(
                '/adp/api/ovp/metamodel',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ dataSource: dataSources[0] })
                })
            );

            expect(ODataModelMock).toHaveBeenCalledWith(
                '/sap/opu/odata/sap/TEST_SRV/',
                expect.objectContaining({
                    annotationURI: ['/sap/annotation/$value'],
                    loadAnnotationsJoined: true
                })
            );

            expect(result).toBeDefined();
            expect(result!.oEntityContainers).toEqual(mockEntityContainer);
            expect(result!.oSchema).toEqual(mockSchema);
            expect(result!.modelInformation).toEqual(mockServiceInfo.modelInformation);
        });

        test('returns undefined when server returns null', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(null)
            });
            initOvpWindowFunctions();

            const result = await window.getMetaModelForNewDataSource(
                [{ ID: '1', Title: 'T' }],
                'appId'
            );
            expect(result).toBeUndefined();
            expect(ODataModelMock).not.toHaveBeenCalled();
        });

        test('throws on non-ok response', async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 404 });
            initOvpWindowFunctions();

            await expect(
                window.getMetaModelForNewDataSource([{ ID: '1', Title: 'T' }], 'appId')
            ).rejects.toThrow('Failed to fetch metamodel: 404');
        });
    });
});
