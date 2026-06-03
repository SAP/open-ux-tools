import { jest } from '@jest/globals';
import type * as hpm from 'http-proxy-middleware';

// Pre-import real utils to use as spread base (filterExcludeComponentNamespace must run real logic)
const actualUtils = await import('../../src/base/utils.js');

// Define mock functions
const mockCreateProxyMiddleware = jest.fn<typeof hpm.createProxyMiddleware>();
const mockProxyRequestHandler = jest.fn<typeof actualUtils.proxyRequestHandler>();
const mockProxyResponseHandler = jest.fn<typeof actualUtils.proxyResponseHandler>();
const mockProxyErrorHandler = jest.fn<typeof actualUtils.proxyErrorHandler>();
const mockFilterCompressedHtmlFiles = jest.fn<() => boolean>().mockReturnValue(true);
const mockUpdateProxyEnv = jest.fn<typeof actualUtils.updateProxyEnv>();
const mockGetPathRewrite = jest
    .fn<typeof actualUtils.getPathRewrite>()
    .mockReturnValue(jest.fn() as unknown as hpm.Options['pathRewrite']);

// Mock http-proxy-middleware
jest.unstable_mockModule('http-proxy-middleware', () => ({
    createProxyMiddleware: mockCreateProxyMiddleware
}));

// Mock utils so proxy.ts uses our mocked functions (real filterExcludeComponentNamespace for integration tests)
jest.unstable_mockModule('../../src/base/utils', () => ({
    ...actualUtils,
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
    getProxyForUrl: jest.fn<() => string>().mockReturnValue('')
}));

// Import after mocking
const { ui5Proxy } = await import('../../src/base/proxy.js');
const { ToolsLogger } = await import('@sap-ux/logger');

describe('proxy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPathRewrite.mockReturnValue(jest.fn() as unknown as hpm.Options['pathRewrite']);
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

        const customFilterFn = jest.fn<() => boolean>().mockReturnValue(true);

        ui5Proxy(config, {}, customFilterFn);
        expect(mockCreateProxyMiddleware).toHaveBeenCalledTimes(1);

        // Verify pathFilter is a function
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        expect(typeof proxyConfig.pathFilter).toBe('function');

        // Test that the custom filter is called when pathFilter is invoked
        const mockReq = { headers: {} } as any;
        (proxyConfig.pathFilter as (path: string, req: any) => boolean)('/test/path.js', mockReq);

        // Verify the custom filter was called
        expect(customFilterFn).toHaveBeenCalledTimes(1);
        expect(customFilterFn).toHaveBeenCalledWith('/test/path.js', mockReq);

        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: namespace exclusion filter excludes internal paths', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        const mockMiddlewareUtil = {
            getProject: jest.fn<() => any>().mockReturnValue({
                getType: jest.fn<() => string>().mockReturnValue('component'),
                getNamespace: jest.fn<() => string>().mockReturnValue('my/app/namespace')
            })
        };

        ui5Proxy(config, {}, undefined, undefined, mockMiddlewareUtil as any);

        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        const pathFilter = proxyConfig.pathFilter as (path: string, req: any) => boolean;

        const mockReq = { headers: {} } as any;

        // Test that internal namespace paths are excluded
        expect(pathFilter('/resources/my/app/namespace/Component.js', mockReq)).toBe(false);
        expect(pathFilter('/test-resources/my/app/namespace/Test.js', mockReq)).toBe(false);

        // Test that external paths are included
        expect(pathFilter('/resources/sap/ui/core/library.js', mockReq)).toBe(true);
        expect(pathFilter('/test-resources/sap/m/Button.js', mockReq)).toBe(true);
    });

    test('ui5Proxy: string customFilter combined with namespace exclusion filter', () => {
        const config = { path: '/resources', url: 'https://example.example', version: '1.0.0' };
        const mockMiddlewareUtil = {
            getProject: jest.fn<() => any>().mockReturnValue({
                getType: jest.fn<() => string>().mockReturnValue('component'),
                getNamespace: jest.fn<() => string>().mockReturnValue('my/app/namespace')
            })
        };

        ui5Proxy(config, {}, '/resources', undefined, mockMiddlewareUtil as any);

        const pathFilter = mockCreateProxyMiddleware.mock.calls[0][0].pathFilter as (path: string, req: any) => boolean;
        const mockReq = { headers: {} } as any;

        // passes baseFilter (/resources prefix) and not in excluded namespace
        expect(pathFilter('/resources/sap/ui/core/library.js', mockReq)).toBe(true);
        // excluded by namespace filter
        expect(pathFilter('/resources/my/app/namespace/Component.js', mockReq)).toBe(false);
        // blocked by baseFilter (no /resources prefix)
        expect(pathFilter('/test-resources/sap/m/Button.js', mockReq)).toBe(false);
    });

    test('ui5Proxy: string[] customFilter combined with namespace exclusion filter', () => {
        const config = { path: '/resources', url: 'https://example.example', version: '1.0.0' };
        const mockMiddlewareUtil = {
            getProject: jest.fn<() => any>().mockReturnValue({
                getType: jest.fn<() => string>().mockReturnValue('component'),
                getNamespace: jest.fn<() => string>().mockReturnValue('my/app/namespace')
            })
        };

        ui5Proxy(config, {}, ['/resources', '/other'], undefined, mockMiddlewareUtil as any);

        const pathFilter = mockCreateProxyMiddleware.mock.calls[0][0].pathFilter as (path: string, req: any) => boolean;
        const mockReq = { headers: {} } as any;

        // passes both patterns, not in excluded namespace
        expect(pathFilter('/resources/sap/ui/core/library.js', mockReq)).toBe(true);
        expect(pathFilter('/other/some/file.js', mockReq)).toBe(true);
        // excluded by namespace filter
        expect(pathFilter('/resources/my/app/namespace/Component.js', mockReq)).toBe(false);
        // blocked by baseFilter
        expect(pathFilter('/test-resources/sap/m/Button.js', mockReq)).toBe(false);
    });

    test('ui5Proxy: glob customFilter combined with namespace exclusion filter', () => {
        const config = { path: '/resources', url: 'https://example.example', version: '1.0.0' };
        const mockMiddlewareUtil = {
            getProject: jest.fn<() => any>().mockReturnValue({
                getType: jest.fn<() => string>().mockReturnValue('component'),
                getNamespace: jest.fn<() => string>().mockReturnValue('my/app/namespace')
            })
        };

        ui5Proxy(config, {}, '/resources/**', undefined, mockMiddlewareUtil as any);

        const pathFilter = mockCreateProxyMiddleware.mock.calls[0][0].pathFilter as (path: string, req: any) => boolean;
        const mockReq = { headers: {} } as any;

        // passes glob and not in excluded namespace
        expect(pathFilter('/resources/sap/ui/core/library.js', mockReq)).toBe(true);
        // excluded by namespace filter
        expect(pathFilter('/resources/my/app/namespace/Component.js', mockReq)).toBe(false);
        // blocked by glob (no match)
        expect(pathFilter('/test-resources/sap/m/Button.js', mockReq)).toBe(false);
    });

    test('ui5Proxy: namespace exclusion filter not applied for non-component projects', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        const mockMiddlewareUtil = {
            getProject: jest.fn<() => any>().mockReturnValue({
                getType: jest.fn<() => string>().mockReturnValue('library'),
                getNamespace: jest.fn<() => string>().mockReturnValue('my/library')
            })
        };

        ui5Proxy(config, {}, undefined, undefined, mockMiddlewareUtil as any);

        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        const pathFilter = proxyConfig.pathFilter as (path: string, req: any) => boolean;

        const mockReq = { headers: {} } as any;

        // All paths should pass through since it's not a component
        expect(pathFilter('/resources/my/library/library.js', mockReq)).toBe(true);
        expect(pathFilter('/test-resources/my/library/Test.js', mockReq)).toBe(true);
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
