import type { ClientRequest, IncomingMessage } from 'http';
import type { Options } from 'http-proxy-middleware';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import {
    enhanceConfigsForDestination,
    enhanceConfigForSystem,
    ProxyEventHandlers,
    PathRewriters,
    proxyErrorHandler,
    type EnhancedIncomingMessage
} from '../../src/base/proxy';
import { generateProxyMiddlewareOptions, createProxy } from '../../src';
import { BackendConfig, DestinationBackendConfig, LocalBackendConfig } from '../../src/base/types';
import { AuthenticationType, BackendSystem } from '@sap-ux/store';
import { getInstance } from '@sap-ux/store/dist/services/backend-system';

jest.mock('@sap-ux/store/dist/services/api-hub', () => ({
    getInstance: jest.fn().mockReturnValue({ read: () => {} })
}));
jest.mock('@sap-ux/store/dist/services/backend-system', () => ({
    getInstance: jest.fn().mockReturnValue({ read: () => {} })
}));
const mockGetService = getInstance as jest.Mock;

// mock required axios-extension functions
import { AbapCloudEnvironment, createForAbapOnCloud } from '@sap-ux/axios-extension';
jest.mock('@sap-ux/axios-extension', () => ({
    ...(jest.requireActual('@sap-ux/axios-extension') as object),
    createForAbapOnCloud: jest.fn()
}));
const mockCreateForAbapOnCloud = createForAbapOnCloud as jest.Mock;

// mock required btp-utils functions
import {
    listDestinations,
    getDestinationUrlForAppStudio,
    WebIDEUsage,
    WebIDEAdditionalData,
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

const mockPrompt = jest.fn();
jest.mock('prompts', () => {
    return () => mockPrompt();
});

describe('proxy', () => {
    type OptionsWithHeaders = Options & { headers: object };
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PathRewriters', () => {
        const { replacePrefix, replaceClient, getPathRewrite, convertAppDescriptorToManifest } = PathRewriters;

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

        test('convertAppDescriptorToManifest', () => {
            const rewrite = convertAppDescriptorToManifest('/my/bsp');
            expect(rewrite('/my/bsp/manifest.appdescr')).toBe('/manifest.json');
            expect(rewrite('/another/manifest.appdescr')).toBe('/another/manifest.appdescr');
            expect(rewrite('/my/bsp/test')).toBe('/my/bsp/test');
            expect(rewrite('/test')).toBe('/test');
        });

        test('getPathRewrite', () => {
            // no rewrite required
            const pathOutput = getPathRewrite({} as BackendConfig, logger);
            expect(pathOutput).toBeDefined();
            expect(pathOutput!('/my/path', { originalUrl: '/my/path' } as EnhancedIncomingMessage)).toEqual('/my/path');

            // all writers added
            const writerChain = getPathRewrite(
                {
                    client: '012',
                    path: '/old',
                    pathReplace: '/my/new',
                    bsp: '/my/bsp'
                } as BackendConfig,
                logger
            );
            expect(writerChain).toBeDefined();
            expect(
                writerChain!('/old/my/bsp/test?sap-client=000', {
                    originalUrl: '/old/my/bsp/test?sap-client=000'
                } as EnhancedIncomingMessage)
            ).toBe('/my/new/my/bsp/test?sap-client=012');
            expect(writerChain!('/test', { originalUrl: '/my/new' } as EnhancedIncomingMessage)).toBe(
                '/test?sap-client=012'
            ); //Invalid test: bypassing the proxy to test its pathRewrite function with an illegal path '/test' is not allowed.
            expect(
                writerChain!('/bsp/manifest.appdescr', {
                    originalUrl: '/my/bsp/manifest.appdescr'
                } as EnhancedIncomingMessage)
            ).toBe('/manifest.json');
        });
    });

    describe('ProxyEventHandlers', () => {
        const { proxyReq, proxyRes } = ProxyEventHandlers;

        test('proxyReq', () => {
            const mockSetHeader = jest.fn() as unknown;

            proxyReq({ setHeader: mockSetHeader } as ClientRequest);
            expect(mockSetHeader).not.toHaveBeenCalled();

            proxyReq({ path: 'hello/world', setHeader: mockSetHeader } as ClientRequest);
            expect(mockSetHeader).not.toHaveBeenCalled();

            proxyReq({
                path: 'hello/Fiorilaunchpad.html',
                headersSent: true,
                setHeader: mockSetHeader
            } as ClientRequest);
            expect(mockSetHeader).not.toHaveBeenCalled();

            proxyReq({ path: 'hello/Fiorilaunchpad.html', setHeader: mockSetHeader } as ClientRequest);
            expect(mockSetHeader).toHaveBeenCalledWith('accept-encoding', '*');
        });

        test('proxyRes', () => {
            const response = {} as IncomingMessage;

            // no set-cookie header, nothing to do, nothing changes
            proxyRes(response);
            expect(response).toEqual({});
            response.headers = {};
            proxyRes(response);
            expect(response).toEqual({ headers: {} });
            response.headers['set-cookie'] = [];
            proxyRes(response);
            expect(response).toEqual({ headers: { 'set-cookie': [] } });

            // cookies are modified i.e. SameSite, Domain, Secure, Partitioned are removed
            response.headers['set-cookie'] = [
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; SameSite=None; secure; Domain=example.com Partitioned',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; SameSite=None; Domain=example.com; Partitioned; secure',
                'MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; secure; Domain=example.com; Partitioned; SameSite=None',
                'SameSite=None; MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; Partitioned; secure; Domain=example.com',
                'Domain=example.com MYCOOKIE=123456789qwertzuiop; path=/; HttpOnly; Partitioned; SameSite=None; secure'
            ];
            proxyRes(response);
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
            const requestCausingError = {
                originalUrl: 'my/request/.error'
            } as IncomingMessage & { originalUrl?: string };
            const debugSpy = jest.spyOn(logger, 'debug');

            // do nothing if no error is provided, but log for debug purposes
            proxyErrorHandler(undefined as unknown as Error, request, logger);
            expect(debugSpy).toHaveBeenCalled();

            // handle CA error
            const certError: Error & { code?: string } = new Error('Certificate error');
            certError.code = 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY';
            proxyErrorHandler(certError, requestWithNext, logger);
            expect(mockNext).toHaveBeenCalled();
            try {
                proxyErrorHandler(certError, request, logger);
            } catch (error) {
                expect(error).not.toBe(certError);
            }
            mockNext.mockReset();

            // forward or throw other errors
            const otherError = new Error();
            proxyErrorHandler(otherError, requestWithNext, logger);
            expect(mockNext).toHaveBeenCalledTimes(1);
            try {
                proxyErrorHandler(otherError, request, logger);
            } catch (error) {
                expect(error).toBe(otherError);
            }

            // ignore empty errors
            debugSpy.mockReset();
            const emptyError = { message: '', stack: 'Error' } as Error;
            proxyErrorHandler(emptyError, requestCausingError, logger);
            expect(debugSpy).toHaveBeenCalledTimes(1);
            expect(debugSpy).toHaveBeenCalledWith(
                `Error ${JSON.stringify(emptyError, null, 2)} thrown for request ${requestCausingError.originalUrl}`
            );
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
                    WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC}`,
                    WebIDEAdditionalData: `${WebIDEAdditionalData.FULL_URL}`
                }
            });
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const modifiedBackend: DestinationBackendConfig = { ...backend };

            await enhanceConfigsForDestination(proxyOptions, modifiedBackend);
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
            expect(modifiedBackend.path).toBe('/sap');
            expect(modifiedBackend.pathReplace).toBe('/');
        });

        test('destination with full url: do not override pathReplace, if set', async () => {
            mockListDestinations.mockResolvedValueOnce({
                [backend.destination]: {
                    Host: 'http://backend.example/sap',
                    WebIDEUsage: `${WebIDEUsage.ODATA_GENERIC}`,
                    WebIDEAdditionalData: `${WebIDEAdditionalData.FULL_URL}`
                }
            });
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const modifiedBackend: DestinationBackendConfig = { ...backend, pathReplace: '/xyz' };

            await enhanceConfigsForDestination(proxyOptions, modifiedBackend);
            expect(proxyOptions.target).toBe(getDestinationUrlForAppStudio(backend.destination));
            expect(modifiedBackend.path).toBe('/sap');
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

            await enhanceConfigForSystem({ ...proxyOptions }, system, 'basic', jest.fn());
            expect(proxyOptions).toEqual(proxyOptions);
        });

        test('oauth required', async () => {
            mockCreateForAbapOnCloud.mockImplementationOnce(() => {
                return {
                    cookies: '~cookies',
                    getAtoInfo: jest.fn().mockReturnValue({})
                };
            });

            try {
                await enhanceConfigForSystem({ headers: {} }, system, 'oauth2', jest.fn());
                fail('Should have thrown an error because no service keys have been provided.');
            } catch (error) {
                expect(error).toBeDefined();
            }

            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const cloudSystem = {
                ...system,
                serviceKeys: { keys: '~keys' },
                refreshToken: '~token'
            };
            const callback = jest.fn();
            await enhanceConfigForSystem(proxyOptions, cloudSystem, 'oauth2', callback);
            expect(mockCreateForAbapOnCloud).toHaveBeenCalledWith({
                environment: AbapCloudEnvironment.Standalone,
                service: cloudSystem.serviceKeys,
                refreshToken: cloudSystem.refreshToken,
                refreshTokenChangedCb: callback
            });
            expect(proxyOptions.headers.cookie).toBe('~cookies');
        });

        test('user/password authentication', async () => {
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            const creds = {
                username: '~user',
                password: '~password'
            };

            // provided from config
            await enhanceConfigForSystem(proxyOptions, { ...system, ...creds }, 'basic', jest.fn());
            expect(proxyOptions.auth).toBe(`${creds.username}:${creds.password}`);

            // provided from env variables
            process.env.FIORI_TOOLS_USER = creds.username;
            process.env.FIORI_TOOLS_PASSWORD = creds.password;
            await enhanceConfigForSystem(proxyOptions, system, 'basic', jest.fn());
            expect(proxyOptions.auth).toBe(`${creds.username}:${creds.password}`);
        });

        test('use reentrance tickets', async () => {
            mockCreateForAbapOnCloud.mockImplementationOnce(() => {
                return {
                    cookies: '~cookies',
                    getAtoInfo: jest.fn().mockReturnValue({})
                };
            });
            const proxyOptions: OptionsWithHeaders = { headers: {} };
            await enhanceConfigForSystem(
                proxyOptions,
                {
                    ...system,
                    authenticationType: AuthenticationType.ReentranceTicket
                },
                'reentranceTicket',
                jest.fn()
            );

            expect(proxyOptions.headers.cookie).toBe('~cookies');
            expect(mockCreateForAbapOnCloud).toHaveBeenCalledWith({
                ignoreCertErrors: false,
                environment: AbapCloudEnvironment.EmbeddedSteampunk,
                url: system.url
            });
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
            expect(options?.on?.error).toBeDefined();
            expect(options?.on?.proxyReq).toBeDefined();
            expect(options?.on?.proxyRes).toBeDefined();
            expect(options.target).toBe(backend.url);
            expect(options.changeOrigin).toBe(true);
            expect(options.agent).toBeDefined();
            expect(options.ws).toBe(true);
            expect(options.xfwd).toBe(true);
            expect(options.secure).toBe(true);
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
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
            expect(options.agent).toBeUndefined();
            expect(options.ws).toBeUndefined();
            expect(options.xfwd).toBeUndefined();
            expect(options.secure).toBeUndefined();
        });

        test('generate proxy middleware inside of BAS with direct odata service url', async () => {
            mockIsAppStudio.mockReturnValue(true);
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path'
            };

            const options = await generateProxyMiddlewareOptions(backend, undefined, logger);
            expect(options).toBeDefined();
            expect(options.target).toBe(backend.url);
            expect(options.changeOrigin).toBe(true);
            expect(options.agent).toBeUndefined();
            expect(options.ws).toBeUndefined();
            expect(options.xfwd).toBeUndefined();
            expect(options.secure).toBeUndefined();
        });

        test('generate proxy middleware options for FLP Embedded flow', async () => {
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path',
                bsp: 'my_bsp'
            };
            const answers = {
                username: '~user',
                password: '~password'
            };
            mockIsAppStudio.mockReturnValue(false);
            mockPrompt.mockResolvedValue({ ...answers, authNeeded: true });
            const options = await generateProxyMiddlewareOptions(backend);
            expect(options.pathRewrite).toBeDefined();
            expect(options.router).toBeDefined();
            expect(options.auth).toBeDefined();
            expect(options.auth).toBe(`${answers.username}:${answers.password}`);
        });

        test('user/password authentication from env', async () => {
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path'
            };
            const creds = {
                username: '~user',
                password: '~password'
            };
            process.env.FIORI_TOOLS_USER = creds.username;
            process.env.FIORI_TOOLS_PASSWORD = creds.password;
            const proxyOptions = await generateProxyMiddlewareOptions(backend);
            expect(proxyOptions.auth).toBe(`${creds.username}:${creds.password}`);
        });

        test('throw an error if proxyOptions.target is not defined', async () => {
            const backend = { url: '', path: '/my/path' } as LocalBackendConfig;
            await expect(() => generateProxyMiddlewareOptions(backend)).rejects.toThrow(
                `Unable to determine target from configuration:\n${JSON.stringify(backend, null, 2)}`
            );
        });

        test('calling onError calls proxyErrorHandler', async () => {
            const debugSpy = jest.fn();

            jest.mock('@sap-ux/logger', () => {
                return {
                    ...jest.requireActual('@sap-ux/logger'),
                    ToolsLogger: jest.fn().mockImplementation(() => ({
                        debug: debugSpy,
                        info: jest.fn()
                    }))
                };
            });

            jest.resetModules();
            // To ensure the mock is applied the import must be done after the mock is set
            const { generateProxyMiddlewareOptions } = await import('../../src');

            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path'
            };

            const proxyOptions = await generateProxyMiddlewareOptions(backend, {});

            if (typeof proxyOptions?.on?.error === 'function') {
                proxyOptions.on.error(undefined as any, {} as any, {} as any);
                expect(debugSpy).toHaveBeenCalledTimes(1);
            }
        });

        test('generate proxy middleware despite an error when accessing the store', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockGetService.mockReturnValueOnce({
                read: () => {
                    throw new Error();
                }
            });
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path'
            };

            const options = await generateProxyMiddlewareOptions(backend, undefined, logger);
            expect(options).toBeDefined();
        });

        test('host is excluded from proxy', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const noProxyConfig = process.env.no_proxy;
            const backend: LocalBackendConfig = {
                url: 'http://backend.example',
                path: '/my/path',
                proxy: 'http://proxy.example'
            };
            process.env.no_proxy = '.example';

            const options = await generateProxyMiddlewareOptions(backend, undefined, logger);
            expect(options.agent).toBeUndefined();
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
            process.env.no_proxy = noProxyConfig;
        });

        test('host with port is excluded from proxy', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const noProxyConfig = process.env.no_proxy;
            const backend: LocalBackendConfig = {
                url: 'http://backend.example:3333',
                path: '/my/path',
                proxy: 'http://proxy.example'
            };
            process.env.no_proxy = '.example';

            const options = await generateProxyMiddlewareOptions(backend, undefined, logger);
            expect(options.agent).toBeUndefined();
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
            process.env.no_proxy = noProxyConfig;
        });

        test('ip address is excluded from proxy', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const noProxyConfig = process.env.no_proxy;
            process.env.no_proxy = '123.156.255.101';
            const backend: LocalBackendConfig = {
                url: 'http://123.156.255.101',
                path: '/my/path',
                proxy: 'http://proxy.example'
            };
            const options = await generateProxyMiddlewareOptions(backend, undefined, logger);
            expect(options.agent).toBeUndefined();
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
            process.env.no_proxy = noProxyConfig;
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
