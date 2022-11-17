import nock from 'nock';
import { join } from 'path';

import { createServiceForUrl } from '../../src';

describe('ODataService', () => {
    const server = 'https://sap.example';
    const servicePathV2 = '/v2/myservice';
    const servicePathV4 = '/v4/myservice';
    const metadataPath = '/$metadata';
    const expectedMetadata = '<METADATA>';

    beforeAll(() => {
        nock.disableNetConnect();
        nock(server).get(`${servicePathV2}${metadataPath}`).reply(200, expectedMetadata).persist(true);
        nock(server).get(`${servicePathV4}${metadataPath}`).reply(200, expectedMetadata).persist(true);
        nock(server)
            .get(`${servicePathV2}/?$format=json`)
            .replyWithFile(200, join(__dirname, '../abap/mockResponses/v2CatalogDocument.json'))
            .persist(true);
        nock(server)
            .get(`${servicePathV4}/?$format=json`)
            .replyWithFile(200, join(__dirname, '../abap/mockResponses/v4CatalogDocument.json'))
            .persist(true);
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('v2', () => {
        const v2Service = createServiceForUrl(`${server}${servicePathV2}`);
        test('metadata', async () => {
            const metadata = await v2Service.metadata();
            expect(metadata).toBeDefined();
            expect(metadata).toBe(expectedMetadata);
        });
        test('document', async () => {
            const doc = await v2Service.document();
            expect(doc?.EntitySets).toBeDefined();
            expect(doc.EntitySets.length).toBeGreaterThan(0);
            expect(typeof doc.EntitySets[0]).toBe('string');
        });
    });

    describe('v4', () => {
        const v4Service = createServiceForUrl(`${server}${servicePathV4}`);
        test('metadata', async () => {
            const metadata = await v4Service.metadata();
            expect(metadata).toBeDefined();
            expect(metadata).toBe(expectedMetadata);
        });
        test('document', async () => {
            const doc = await v4Service.document();
            expect(doc?.EntitySets).toBeDefined();
            expect(doc.EntitySets.length).toBeGreaterThan(0);
            expect(typeof doc.EntitySets[0]).toBe('string');
        });
    });
});
