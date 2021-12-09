import axios from 'axios';
import nock from 'nock';

import { ServiceProvider } from '../../src';

nock.restore();

describe('ServiceProvider', () => {
    const server = 'https://example.com';
    const servicePath = '/ns/myservice';
    const metadataPath = '/$metadata';
    const client = '010';
    const expectedMetadata = '<METADATA>';

    beforeAll(() => {
        nock.activate();
        nock(server)
            .get(`${servicePath}${metadataPath}?sap-client=${client}`)
            .reply(200, expectedMetadata)
            .persist(true);
    });

    test('create', async () => {
        const response = await axios.get(`${server}${servicePath}${metadataPath}`, {
            params: { 'sap-client': client }
        });
        expect(response.data).toBeDefined();
        expect(response.data).toBe(expectedMetadata);

        // generate axios extensions for a provider and a service
        const provider = ServiceProvider.create({
            baseURL: server,
            params: { 'sap-client': client }
        });
        const service = provider.service(servicePath);

        // fetch metadata with generic get from provider
        const metadataWithProviderGet = await provider.get(`${servicePath}${metadataPath}`);
        expect(metadataWithProviderGet).toBeDefined();
        expect(metadataWithProviderGet.data).toBe(expectedMetadata);

        // fetch metadata using the convinience method
        const metadata = await service.metadata();
        expect(metadata).toBeDefined();
        expect(metadata).toBe(expectedMetadata);
    });

    test('createForServiceUrl', async () => {
        const service = ServiceProvider.createServiceForUrl(`${server}${servicePath}?sap-client=${client}`);
        const metadata = await service.metadata();
        expect(metadata).toBeDefined();
        expect(metadata).toBe(expectedMetadata);
    });
});
