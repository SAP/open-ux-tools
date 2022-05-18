import type { ClientRequest, IncomingMessage } from 'http';
import type { Options } from 'http-proxy-middleware';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import {
    enhanceConfigsForDestination,
    enhanceConfigForSystem,
    ProxyEventHandlers,
    PathRewriters
} from '../../src/base/proxy';
import { generateProxyMiddlewareOptions, createProxy } from '../../src';
import { getCorporateProxyServer } from '../../src/base/config';
import { BackendConfig, DestinationBackendConfig, LocalBackendConfig } from '../../src/base/types';
import { AuthenticationType, BackendSystem } from '@sap-ux/store';

// mock required axios-extension functions
import { createForAbapOnBtp } from '@sap-ux/axios-extension';
jest.mock('@sap-ux/axios-extension', () => ({
    ...(jest.requireActual('@sap-ux/axios-extension') as object),
    createForAbapOnBtp: jest.fn()
}));
const mockCreateForAbapOnBtp = createForAbapOnBtp as jest.Mock;

// mock required btp-utils functions
import {
    listDestinations,
    getDestinationUrlForAppStudio,
    WebIDEUsage,
    getCredentialsForDestinationService,
    isAppStudio
} from '@sap-ux/btp-utils';
jest.mock('@sap-ux/btp-utils', () => ({
    ...(jest.requireActual('@sap-ux/btp-utils') as object),
    listDestinations: jest.fn(),
    getCredentialsForDestinationService: jest.fn(),
    isAppStudio: jest.fn()
}));
const mockListDestinations = listDestinations as jest.Mock;
const mockGetCredentialsForDestinationService = getCredentialsForDestinationService as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('proxy', () => {
    type OptionsWithHeaders = Options & { headers: object };
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PathRewriters', () => {
        const { replacePrefix, replaceClient, getPathRewrite } = PathRewriters;

        test('replacePrefix', () => {
            const rewrite = replacePrefix('/old', '/my/new');
            expect(rewrite('/old/test')).toBe('/my/new/test');
            expect(rewrite('/test')).toBe('/test');
        });

        test('replaceClient', () => {
            const rewrite = replaceClient('012');
            expect(rewrite('/test')).toBe('/test?sap-client=012');
            expect(rewrite('/test?sap-language=en')).toBe('/test?sap-language=en&sap-client=012');
            expect(rewrite('/test?sap-client=000')).toBe('/test?sap-client=012');
        });

        test('getPathRewrite', () => {
            // no rewrite required
            expect(getPathRewrite({} as BackendConfig, logger)).toBeUndefined();

            // all writers added
            const writerChain = getPathRewrite(
                {
                    client: '012',
                    path: '/old',
                    pathReplace: '/my/new'
                } as BackendConfig,
                logger
            );
            expect(writerChain).toBeDefined();
            expect(writerChain!('/old/my/bsp/test?sap-client=000')).toBe('/my/new/my/bsp/test?sap-client=012');
            expect(writerChain!('/test')).toBe('/test?sap-client=012');
        });
    });

    describe('ProxyEventHandlers', () => {
        const { onProxyReq, onProxyRes, onError } = ProxyEventHandlers;

        test('onProxyReq', () => {
            const mockSetHeader = jest.fn();

            onProxyReq({ path: 'hello/world', setHeader: mockSetHeader as unknown } as ClientRequest);
            expect(mockSetHeader).not.toBeCalled();

            onProxyReq({
                path: 'hello/Fiorilaunchpad.html',
                headersSent: true,
                setHeader: mockSetHeader as unknown
            } as ClientRequest);
            expect(mockSetHeader).not.toBeCalled();

            onProxyReq({ path: 'hello/Fiorilaunchpad.html', setHeader: mockSetHeader as unknown } as ClientRequest);
            expect(mockSetHeader).toBeCalled();
        });

        test('onProxyRes', () => {
            const response = {} as IncomingMessage;

            // no set-cookie header, nothing to do, nothing changes
            onProxyRes(response);
            expect(response).toEqual({});
            response.headers = {};
            onProxyRes(response);
            expect(response).toEqual({ headers: {} });
            response.headers['set-cookie'] = [];
            onProxyRes(response);
            expect(response).toEqual({ headers: { 'set-cookie': [] } });

            // cookies are modified i.e. SameSite, Domain, Secure are removed
            response.headers['set-cookie'] = [
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; SameSite=None; secure; Domain=example.com',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; SameSite=None; Domain=example.com; secure',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; secure; Domain=example.com; SameSite=None',
                'SameSite=None; MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; secure; Domain=example.com',
                'Domain=example.com MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; SameSite=None; secure'
            ];
            onProxyRes(response);
            expect(response.headers['set-cookie']).toEqual([
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly;',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly;',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly;',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly;',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly;'
            ]);
        });

        test('onError', () => {
            const mockNext = jest.fn();
            const request = {} as IncomingMessage;
            const requestWithNext = {
                next: mockNext as Function
            } as IncomingMessage & { next: Function };

            // do nothing if no error is provided
            onError(undefined as unknown as Error, request);

            // handle CA error
            const certError: Error & { code?: string } = new Error('Certificate error');
            certError.code = 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY';
            onError(certError, requestWithNext);
            expect(mockNext).toBeCalled();
            try {
                onError(certError, request);
            } catch (error) {
                expect(error).not.toBe(certError);
            }
            mockNext.mockReset();

            // forward or throw other errors
            const otherError = new Error();
            onError(otherError, requestWithNext);
            expect(mockNext).toBeCalledTimes(1);
            try {
                onError(otherError, request);
            } catch (error) {
                expect(error).toBe(otherError);
            }
        });
    });

    describe('enhanceConfigsForDestination', () => {
        const backend = {
            destination: '~destination',
            path: '/sap/xyz'
        };

        test('unknown destination', async () => {
            try {
                await enhanceConfigsForDestination({ headers: {} }, backend);
                fail('Unknown destination should have resulted in an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('simple common destination', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {}
            });
            const proxyOptions: OptionsWithHeaders = { headers: {} };

            await enhanceConfigsForDestination(proxyOptions, backend);
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
        });

        test('destination with full url', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {
                    Host: 'http://backend.example/sap',
                    WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC},${WebIDEUsage.FULL_URL}`
                }
            });
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const modifiedBackend: DestinationBackendConfig = { ...backend };

            await enhanceConfigsForDestination(proxyOptions, modifiedBackend);
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
            expect(modifiedBackend.pathReplace).toBe('/xyz');
        });

        test('destination provided by a destination service instance', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {
                    Host: 'http://backend.example'
                }
            });
            const cred = '~base64EncodedCredentials';
            mockGetCredentialsForDestinationService.mockResolvedValue(cred);
            const proxyOptions: OptionsWithHeaders = { headers: {} };

            await enhanceConfigsForDestination(proxyOptions, {
                ...backend,
                destinationInstance: '~destinationInstance'
            });
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
            expect(proxyOptions.headers!['bas-destination-instance-cred']).toBe(cred);
        });
    });

    describe('enhanceConfigForSystem', () => {
        const system: BackendSystem = {
            name: 'example',
            url: 'http://backend.example'
        };

        test('simple system', async () => {
            const proxyOptions: OptionsWithHeaders = { headers: {} };

            await enhanceConfigForSystem({ ...proxyOptions }, system, false, jest.fn());
            expect(proxyOptions).toEqual(proxyOptions);
        });

        test('oauth required', async () => {
            mockCreateForAbapOnBtp.mockImplementationOnce(() => {
                return {
                    cookies: '~cookies',
                    getAtoInfo: jest.fn()
                };
            });

            try {
                await enhanceConfigForSystem({ headers: {} }, system, true, jest.fn());
                fail('Should have thrown an error because no service keys have been provided.');
            } catch (error) {
                expect(error).toBeDefined();
            }

            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const cloudSystem = {
                ...system,
                serviceKeys: '{"keys": "~keys"}',
                refreshToken: '~token'
            };
            const callback = jest.fn();
            await enhanceConfigForSystem(proxyOptions, cloudSystem, true, callback);
            expect(proxyOptions.headers.cookie).toBe('~cookies');
            expect(mockCreateForAbapOnBtp).toBeCalledWith(
                JSON.parse(cloudSystem.serviceKeys),
                cloudSystem.refreshToken,
                callback
            );
        });

        test('user/password authentication', async () => {
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const creds = {
                username: '~user',
                password: '~password'
            };

            // provided from config
            await enhanceConfigForSystem(proxyOptions, { ...system, ...creds }, false, jest.fn());
            expect(proxyOptions.auth).toBe(`${creds.username}:${creds.password}`);

            // provided from env variables
            process.env.FIORI_TOOLS_USER = creds.username;
            process.env.FIORI_TOOLS_PASSWORD = creds.password;
            await enhanceConfigForSystem(proxyOptions, system, false, jest.fn());
            expect(proxyOptions.auth).toBe(`${creds.username}:${creds.password}`);
        });

        test('use reentrance tickets', async () => {
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            try {
                await enhanceConfigForSystem(
                    proxyOptions,
                    {
                        ...system,
                        authenticationType: AuthenticationType.ReentranceTicket
                    },
                    false,
                    jest.fn()
                );
                fail('It should not have worked because the implementation is missing');
            } catch (error) {
                expect(error.message).toContain('open-ux-tools/pull/485');
            }
        });
    });

    describe('generateProxyMiddlewareOptions', () => {
        test('generate proxy middleware outside of BAS with all parameters', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path',
                proxy: 'http://proxy.example',
                apiHub: true
            };
            const baseOptions: Options = {
                secure: true,
                ws: true,
                xfwd: true
            };

            const options = await generateProxyMiddlewareOptions(backend, baseOptions, logger);
            expect(options).toBeDefined();
            expect(options.target).toBe(backend.url);
            expect(options.changeOrigin).toBe(true);
            expect(options.agent).toBeDefined();
            expect(options.ws).toBe(true);
            expect(options.xfwd).toBe(true);
            expect(options.secure).toBe(true);
        });

        test('generate proxy middleware inside of BAS with minimal parameters', async () => {
            mockIsAppStudio.mockReturnValue(true);
            const backend: DestinationBackendConfig = {
                destination: '~destination',
                path: '/my/path'
            };
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {}
            });

            const options = await generateProxyMiddlewareOptions(backend, undefined, logger);
            expect(options).toBeDefined();
            expect(options.target).toBe(getDestinationUrlForAppStudio(backend.destination));
            expect(options.changeOrigin).toBe(true);
            if (getCorporateProxyServer()) {
                expect(options.agent).toBeDefined();
            } else {
                expect(options.agent).toBeUndefined();
            }
            expect(options.ws).toBeUndefined();
            expect(options.xfwd).toBeUndefined();
            expect(options.secure).toBeUndefined();
        });
    });

    describe('createProxy', () => {
        test('standard input', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path'
            };

            const proxy = await createProxy(backend, {}, logger);
            expect(proxy).toBeDefined();
            expect(typeof proxy).toBe('function');
        });
    });
});
