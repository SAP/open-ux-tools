import type { Destination } from '@sap-ux/btp-utils';
import { getDestinationUrlForAppStudio, WebIDEUsage, BAS_DEST_INSTANCE_CRED_HEADER } from '@sap-ux/btp-utils';
import axios from 'axios';
import nock from 'nock';
import { create, createServiceForUrl, createForDestination, ServiceProvider, AbapServiceProvider } from '../src';
import * as ProxyFromEnv from 'proxy-from-env';

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

jest.mock('https-proxy-agent', () => {
    const original = jest.requireActual('https-proxy-agent');
    return {
        ...original,
        connect: jest.fn()
    };
});

jest.mock('proxy-from-env');

beforeAll(() => {
    nock.disableNetConnect();
    nock(server).get(`${servicePath}${metadataPath}?sap-client=${client}`).reply(200, expectedMetadata).persist(true);
});

afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
});
test('create', async () => {
    const getProxyForUrlSpy = jest.spyOn(ProxyFromEnv, 'getProxyForUrl').mockReturnValue(undefined);
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
    expect(getProxyForUrlSpy).toHaveBeenNthCalledWith(1, `${server}${servicePath}${metadataPath}?sap-client=${client}`);
    getProxyForUrlSpy.mockRestore();
    expect(provider.defaults.proxy).toBeUndefined();
    expect(provider.defaults.httpAgent).toBeUndefined();
    expect(provider.defaults.httpsAgent).toBeDefined();
});

test('create with proxy', async () => {
    const getProxyForUrlSpy = jest.spyOn(ProxyFromEnv, 'getProxyForUrl').mockReturnValue('http://proxy.example:8080');
    const provider = create({
        baseURL: server,
        params: { 'sap-client': client }
    });
    expect(getProxyForUrlSpy).toHaveBeenNthCalledWith(1, `${server}`);
    getProxyForUrlSpy.mockRestore();
    expect(provider.defaults.proxy).toEqual(false);
    expect(provider.defaults.httpAgent).toBeDefined();
    expect(provider.defaults.httpsAgent).toBeDefined();
});

test('createForServiceUrl', async () => {
    const service = createServiceForUrl(`${server}${servicePath}?sap-client=${client}`);
    const metadata = await service.metadata();
    expect(metadata).toBeDefined();
    expect(metadata).toBe(expectedMetadata);

    // Ensure axios config params are not overwritten
    const serviceWithParams = createServiceForUrl(`${server}${servicePath}?sap-client=999`, {
        params: { 'abc': '123' }
    });
    expect((serviceWithParams.defaults.params as URLSearchParams).get('abc')).toEqual('123');
    expect((serviceWithParams.defaults.params as URLSearchParams).get('sap-client')).toEqual('999');
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
        expect((provider as AbapServiceProvider).publicUrl).toBe(destination.Host);
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
        expect((provider as AbapServiceProvider).publicUrl).toBe(destination.Host);
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
