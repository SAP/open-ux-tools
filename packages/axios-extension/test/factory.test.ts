import { Destination, getDestinationUrlForAppStudio } from '@sap-ux/btp-utils/src';
import axios from 'axios';
import nock from 'nock';
import { create, createServiceForUrl, createForDestination, ServiceProvider, AbapServiceProvider } from '../src';

const server = 'https://sap.example';
const servicePath = '/ns/myservice';
const metadataPath = '/$metadata';
const client = '010';
const expectedMetadata = '<METADATA>';

nock.disableNetConnect();

beforeAll(() => {
    nock(server).get(`${servicePath}${metadataPath}?sap-client=${client}`).reply(200, expectedMetadata).persist(true);
});

test('create', async () => {
    const response = await axios.get(`${server}${servicePath}${metadataPath}`, {
        params: { 'sap-client': client }
    });
    expect(response.data).toBeDefined();
    expect(response.data).toBe(expectedMetadata);

    // generate axios extensions for a provider and a service
    const provider = create({
        baseURL: server,
        params: { 'sap-client': client }
    });
    const service = provider.service(servicePath);

    // fetch metadata with generic get from provider
    const metadataWithProviderGet = await provider.get(`${servicePath}${metadataPath}`);
    expect(metadataWithProviderGet).toBeDefined();
    expect(metadataWithProviderGet.data).toBe(expectedMetadata);

    // fetch metadata using the convenience method
    const metadata = await service.metadata();
    expect(metadata).toBeDefined();
    expect(metadata).toBe(expectedMetadata);
});

test('createForServiceUrl', async () => {
    const service = createServiceForUrl(`${server}${servicePath}?sap-client=${client}`);
    const metadata = await service.metadata();
    expect(metadata).toBeDefined();
    expect(metadata).toBe(expectedMetadata);
});

describe('createForDestination', () => {
    const destination: Destination = {
        Name: '~name',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        ProxyType: 'OnPremise',
        Host: server,
        Description: '~description'
    };

    test('Not an ABAP system', async () => {
        const provider = await createForDestination(destination);
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(await getDestinationUrlForAppStudio(destination));
        expect(provider).toBeInstanceOf(ServiceProvider);
    });

    test('ABAP system', async () => {
        const provider = await createForDestination({ ...destination, WebIDEUsage: 'odata_abap' });
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(await getDestinationUrlForAppStudio(destination));
        expect(provider).toBeInstanceOf(AbapServiceProvider);
    });

    test.skip('System from destination service', async () => {
        // TODO: mock calls to cf-tools (or btp-utils)
        const provider = await createForDestination(destination);
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(
            await getDestinationUrlForAppStudio(destination, '~destServiceInstanceId')
        );
    });
});
