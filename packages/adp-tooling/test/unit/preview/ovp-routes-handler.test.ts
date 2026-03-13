import express from 'express';
import supertest from 'supertest';
import type { SuperTest, Test } from 'supertest';
import { ToolsLogger } from '@sap-ux/logger';
import OvpRoutesHandler from '../../../src/preview/ovp-routes-handler';

const mockServices = [
    {
        ID: 'SRV_001',
        Title: 'TEST_SERVICE',
        Description: 'Test Service Description',
        TechnicalServiceName: 'TEST_SERVICE',
        TechnicalServiceVersion: 1,
        ServiceUrl: '/sap/opu/odata/sap/TEST_SERVICE/',
        MetadataUrl: 'https://example.com/$metadata'
    },
    {
        ID: 'SRV_002',
        Title: 'ANOTHER_SERVICE',
        Description: 'Another Test Service',
        TechnicalServiceName: 'ANOTHER_SERVICE',
        TechnicalServiceVersion: 1,
        ServiceUrl: '/sap/opu/odata/sap/ANOTHER_SERVICE/',
        MetadataUrl: 'https://example.com/$metadata'
    }
];

const mockAnnotations = [
    {
        TechnicalName: 'TEST_ANNOTATION',
        Version: '0001',
        Definitions: '<edmx:Edmx>mock annotation</edmx:Edmx>',
        Uri: 'https://example.com/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName=TEST_ANNOTATION)/$value'
    }
];

const mockCatalogService = {
    get: jest.fn().mockResolvedValue({
        odata: () => mockServices
    }),
    getAnnotations: jest.fn().mockResolvedValue(mockAnnotations)
};

const mockProvider = {
    catalog: jest.fn().mockReturnValue(mockCatalogService)
} as any;

describe('OvpRoutesHandler', () => {
    let server: SuperTest<Test>;
    const logger = new ToolsLogger();

    beforeEach(() => {
        jest.clearAllMocks();
        const handler = new OvpRoutesHandler(mockProvider, logger);
        const app = express();
        app.use(express.json());
        app.get('/adp/api/ovp/datasources', handler.handleGetDataSources);
        app.post('/adp/api/ovp/metamodel', handler.handleGetMetaModel);
        server = supertest(app);
    });

    describe('handleGetDataSources', () => {
        test('returns list of services from V2 catalog', async () => {
            const response = await server.get('/adp/api/ovp/datasources');
            expect(response.status).toBe(200);
            expect(response.body.results).toHaveLength(2);
            expect(response.body.results[0].ID).toBe('SRV_001');
            expect(response.body.results[0].Title).toBe('TEST_SERVICE');
            expect(response.body.results[1].ID).toBe('SRV_002');
            expect(mockProvider.catalog).toHaveBeenCalledWith('2');
        });

        test('returns 500 when catalog service fails', async () => {
            mockCatalogService.get.mockRejectedValueOnce(new Error('Connection refused'));
            const response = await server.get('/adp/api/ovp/datasources');
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Failed to fetch data sources');
        });
    });

    describe('handleGetMetaModel', () => {
        test('returns service info and annotation URIs for a valid data source', async () => {
            const response = await server
                .post('/adp/api/ovp/metamodel')
                .send({ dataSource: { ID: 'SRV_001', Title: 'TEST_SERVICE' } });

            expect(response.status).toBe(200);
            expect(response.body.serviceUrl).toBe('/sap/opu/odata/sap/TEST_SERVICE/');
            expect(response.body.annotations).toHaveLength(1);
            expect(response.body.annotations[0].TechnicalName).toBe('TEST_ANNOTATION');
            expect(response.body.annotations[0].Uri).toBe(
                '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName=TEST_ANNOTATION)/$value'
            );
            expect(response.body.modelInformation.serviceURI).toBe('/sap/opu/odata/sap/TEST_SERVICE');
            expect(response.body.modelInformation.serviceAnnotation).toBe('TEST_ANNOTATION');
            expect(mockCatalogService.getAnnotations).toHaveBeenCalledWith({ id: 'SRV_001' });
        });

        test('uses title filter when ID is missing', async () => {
            const response = await server
                .post('/adp/api/ovp/metamodel')
                .send({ dataSource: { Title: 'TEST_SERVICE' } });

            expect(response.status).toBe(200);
            expect(mockCatalogService.getAnnotations).toHaveBeenCalledWith({ title: 'TEST_SERVICE' });
        });

        test('returns null when no annotations are found', async () => {
            mockCatalogService.getAnnotations.mockResolvedValueOnce([]);
            const response = await server
                .post('/adp/api/ovp/metamodel')
                .send({ dataSource: { ID: 'SRV_001', Title: 'TEST_SERVICE' } });

            expect(response.status).toBe(200);
            expect(response.body).toBeNull();
        });

        test('returns 400 when dataSource is missing', async () => {
            const response = await server.post('/adp/api/ovp/metamodel').send({});
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('dataSource with Title is required');
        });

        test('returns 400 when dataSource has no Title', async () => {
            const response = await server
                .post('/adp/api/ovp/metamodel')
                .send({ dataSource: { ID: 'SRV_001' } });
            expect(response.status).toBe(400);
        });

        test('returns 500 when annotation fetch fails', async () => {
            mockCatalogService.getAnnotations.mockRejectedValueOnce(new Error('Service unavailable'));
            const response = await server
                .post('/adp/api/ovp/metamodel')
                .send({ dataSource: { ID: 'SRV_001', Title: 'TEST_SERVICE' } });
            expect(response.status).toBe(500);
            expect(response.body.message).toContain('Failed to fetch metamodel');
        });
    });
});
