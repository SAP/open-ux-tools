import type { Destination } from '@sap-ux/btp-utils';
import { getDestinationUrlForAppStudio, WebIDEUsage, BAS_DEST_INSTANCE_CRED_HEADER } from '@sap-ux/btp-utils';
import axios from 'axios';
import nock from 'nock';
import { create, createServiceForUrl, createForDestination, ServiceProvider, AbapServiceProvider } from '../src';

const server = 'https://sap.example';
const servicePath = '/ns/myservice';
const metadataPath = '/$metadata';
const client = '010';
const expectedMetadata = '<METADATA>';
const destinationServiceCreds = 'EXAMPLE_BASE64';

jest.mock('@sap-ux/btp-utils', () => {
    const original = jest.requireActual('@sap-ux/btp-utils');
    return {
        ...original,
        getCredentialsForDestinationService: jest.fn(() => {
            return destinationServiceCreds;
        })
    };
});

beforeAll(() => {
    nock.disableNetConnect();
    nock(server).get(`${servicePath}${metadataPath}?sap-client=${client}`).reply(200, expectedMetadata).persist(true);
});

afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
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
        Name: 'name',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        ProxyType: 'OnPremise',
        Host: server,
        Description: 'description'
    };

    test('Not an ABAP system', () => {
        const provider = createForDestination({}, destination);
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(getDestinationUrlForAppStudio(destination.Name));
        expect(provider).toBeInstanceOf(ServiceProvider);
    });

    test('ABAP system', () => {
        const provider = createForDestination({}, { ...destination, WebIDEUsage: WebIDEUsage.ODATA_ABAP });
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(getDestinationUrlForAppStudio(destination.Name));
        expect(provider).toBeInstanceOf(AbapServiceProvider);
    });

    test('ABAP system with additional credentials', async () => {
        const auth = {
            username: 'MY_USER',
            password: 'MY_SECRET'
        };
        const provider = createForDestination({ auth }, { ...destination, WebIDEUsage: WebIDEUsage.ODATA_ABAP });
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(getDestinationUrlForAppStudio(destination.Name));
        expect(provider.defaults.auth).toEqual(auth);
        expect(provider).toBeInstanceOf(AbapServiceProvider);
    });

    test('System from destination service', async () => {
        const provider = createForDestination({}, destination, 'destServiceInstanceId');
        expect(provider).toBeDefined();
        expect(provider.defaults.baseURL).toBe(getDestinationUrlForAppStudio(destination.Name));
        // trigger a first request to fetch the destination service user
        nock(`https://${destination.Name}.dest`).get(/.*/).reply(200);
        await provider.get('/');
        expect(provider.defaults.baseURL).toContain(destination.Name);
        expect(provider.defaults.headers.common[BAS_DEST_INSTANCE_CRED_HEADER]).toBe(destinationServiceCreds);
    });
});
