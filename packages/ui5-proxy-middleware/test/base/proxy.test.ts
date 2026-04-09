import { jest } from '@jest/globals';
import type * as hpm from 'http-proxy-middleware';

// Define mock functions
const mockCreateProxyMiddleware = jest.fn<any>();
const mockProxyRequestHandler = jest.fn();
const mockProxyResponseHandler = jest.fn();
const mockProxyErrorHandler = jest.fn();
const mockFilterCompressedHtmlFiles = jest.fn();
const mockUpdateProxyEnv = jest.fn();
const mockGetPathRewrite = jest.fn<any>().mockReturnValue(jest.fn());

// Mock http-proxy-middleware
jest.unstable_mockModule('http-proxy-middleware', () => ({
    createProxyMiddleware: mockCreateProxyMiddleware
}));

// Mock utils so proxy.ts uses our mocked functions
jest.unstable_mockModule('../../src/base/utils', () => ({
    proxyRequestHandler: mockProxyRequestHandler,
    proxyResponseHandler: mockProxyResponseHandler,
    proxyErrorHandler: mockProxyErrorHandler,
    filterCompressedHtmlFiles: mockFilterCompressedHtmlFiles,
    updateProxyEnv: mockUpdateProxyEnv,
    getPathRewrite: mockGetPathRewrite,
    getCorporateProxyServer: jest.fn(),
    hideProxyCredentials: jest.fn(),
    resolveUI5Version: jest.fn(),
    directLoadProxy: jest.fn(),
    injectScripts: jest.fn(),
    setUI5Version: jest.fn(),
    getHTMLFile: jest.fn(),
    getYamlFile: jest.fn(),
    sendResponse: jest.fn(),
    injectUI5Url: jest.fn()
}));

// Mock proxy-from-env
jest.unstable_mockModule('proxy-from-env', () => ({
    getProxyForUrl: jest.fn().mockReturnValue('')
}));

// Import after mocking
const { ui5Proxy } = await import('../../src/base/proxy');
const { ToolsLogger } = await import('@sap-ux/logger');

describe('proxy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPathRewrite.mockReturnValue(jest.fn());
    });

    test('ui5Proxy: creates an ui5 proxy middleware, default params', () => {
        const config = {
            debug: false,
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith({
            changeOrigin: true,
            target: 'https://example.example',
            logger: undefined,
            on: {
                proxyReq: expect.any(Function),
                proxyRes: expect.any(Function),
                error: expect.any(Function)
            },
            pathRewrite: expect.any(Function),
            pathFilter: mockFilterCompressedHtmlFiles
        });
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: creates an ui5 proxy middleware, additional params', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: ''
        };

        const options: hpm.Options = {
            secure: true,
            logger: new ToolsLogger(),
            changeOrigin: false
        };

        ui5Proxy(config, options);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith({
            changeOrigin: false,
            secure: true,
            logger: expect.any(ToolsLogger),
            target: 'https://example.example',
            on: {
                proxyReq: expect.any(Function),
                proxyRes: expect.any(Function),
                error: expect.any(Function)
            },
            pathRewrite: expect.any(Function),
            pathFilter: mockFilterCompressedHtmlFiles
        });
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: creates an ui5 proxy middleware, custom filter function', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: ''
        };

        const customFilterFn: hpm.Filter = (_pathname, _req) => {
            console.log('This is my custom filter function');
            return true;
        };

        ui5Proxy(config, {}, customFilterFn);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(expect.objectContaining({ pathFilter: customFilterFn }));
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: calling onProxyReq calls proxyRequestHandler', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        if (typeof proxyConfig?.on?.proxyReq === 'function') {
            proxyConfig?.on?.proxyReq({} as any, {} as any, {} as any, {});
            expect(mockProxyRequestHandler).toHaveBeenCalledTimes(1);
            expect(mockProxyRequestHandler).toHaveBeenCalledWith({}, {}, 'W/"1.0.0"');
        }
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: calling onProxyRes calls proxyResponseHandler', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        if (typeof proxyConfig?.on?.proxyRes === 'function') {
            proxyConfig?.on?.proxyRes({} as any, {} as any, {} as any);
            expect(mockProxyResponseHandler).toHaveBeenCalledTimes(1);
            expect(mockProxyResponseHandler).toHaveBeenCalledWith({}, 'W/"1.0.0"');
        }
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: calling onError calls proxyErrorHandler', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        if (typeof proxyConfig?.on?.error === 'function') {
            const err = new Error();
            proxyConfig?.on?.error(err as any, {} as any, {} as any);
            expect(mockProxyErrorHandler).toHaveBeenCalledTimes(1);
            expect(mockProxyErrorHandler).toHaveBeenCalledWith(err, {}, expect.any(ToolsLogger), {}, undefined);
        }
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: calling pathRewrite calls getPathRewrite', () => {
        const config = {
            pathReplace: 'this/path/should/rewrite/',
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };
        ui5Proxy(config);
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        expect(typeof proxyConfig?.pathRewrite).toBe('function');
    });

    test('ui5Proxy: host is not excluded from proxy', async () => {
        const config = {
            path: '/mypath',
            url: 'https://ui5.example',
            version: '1.0.0',
            proxy: 'http://proxy.example'
        };
        ui5Proxy(config);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
    });

    test('ui5Proxy: host is excluded from proxy', async () => {
        const noProxyConfig = process.env.no_proxy;
        const config = {
            path: '/mypath',
            url: 'https://ui5.example',
            version: '1.0.0',
            proxy: 'http://proxy.example'
        };
        process.env.no_proxy = '.example';
        ui5Proxy(config);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
        process.env.no_proxy = noProxyConfig;
    });

    test('ui5Proxy: host with port is excluded from proxy', async () => {
        const noProxyConfig = process.env.no_proxy;
        const config = {
            path: '/mypath',
            url: 'https://ui5.example:3333',
            version: '1.0.0',
            proxy: 'http://proxy.example'
        };
        process.env.no_proxy = '.example';
        ui5Proxy(config);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
        process.env.no_proxy = noProxyConfig;
    });

    test('ui5Proxy: ip address is excluded from proxy', async () => {
        const noProxyConfig = process.env.no_proxy;
        const config = {
            path: '/mypath',
            url: 'http://123.156.255.101',
            version: '1.0.0',
            proxy: 'http://proxy.example'
        };
        process.env.no_proxy = '123.156.255.101';
        ui5Proxy(config);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
        process.env.no_proxy = noProxyConfig;
    });

    test('ui5Proxy: ip address with port is excluded from proxy', async () => {
        const noProxyConfig = process.env.no_proxy;
        const config = {
            path: '/mypath',
            url: 'http://123.156.255.101:3333',
            version: '1.0.0',
            proxy: 'http://proxy.example'
        };
        process.env.no_proxy = '123.156.255.101';
        ui5Proxy(config);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: mockFilterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
        process.env.no_proxy = noProxyConfig;
    });
});
