import { ui5Proxy } from '../../src';
import type * as hpm from 'http-proxy-middleware';
import * as utils from '../../src/base/utils';
import { ToolsLogger } from '@sap-ux/logger';

import { createProxyMiddleware } from 'http-proxy-middleware';

jest.mock('http-proxy-middleware', () => ({
    ...jest.requireActual('http-proxy-middleware'),
    createProxyMiddleware: jest.fn()
}));

const mockCreateProxyMiddleware = createProxyMiddleware as jest.Mock;

describe('proxy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
            pathFilter: utils.filterCompressedHtmlFiles
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
            pathFilter: utils.filterCompressedHtmlFiles
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
        const proxyRequestHandlerSpy = jest.spyOn(utils, 'proxyRequestHandler').mockImplementation(jest.fn());
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        if (typeof proxyConfig?.on?.proxyReq === 'function') {
            proxyConfig?.on?.proxyReq({} as any, {} as any, {} as any, {});
            expect(proxyRequestHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyRequestHandlerSpy).toHaveBeenCalledWith({}, {}, 'W/"1.0.0"');
        }
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: calling onProxyRes calls proxyResponseHandler', () => {
        const proxyResponseHandlerSpy = jest.spyOn(utils, 'proxyResponseHandler').mockImplementation(jest.fn());
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = mockCreateProxyMiddleware.mock.calls[0][0];
        if (typeof proxyConfig?.on?.proxyRes === 'function') {
            proxyConfig?.on?.proxyRes({} as any, {} as any, {} as any);
            expect(proxyResponseHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyResponseHandlerSpy).toHaveBeenCalledWith({}, 'W/"1.0.0"');
        }
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
    });

    test('ui5Proxy: calling onError calls proxyErrorHandler', () => {
        const proxyErrorHandlerSpy = jest.spyOn(utils, 'proxyErrorHandler').mockImplementation(jest.fn());
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
            expect(proxyErrorHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyErrorHandlerSpy).toHaveBeenCalledWith(err, {}, expect.any(ToolsLogger), {}, undefined);
        }
        expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
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
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
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
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
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
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
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
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
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
            expect.objectContaining({ pathFilter: utils.filterCompressedHtmlFiles })
        );
        expect(mockCreateProxyMiddleware).not.toHaveBeenCalledWith({
            agent: expect.objectContaining({})
        });
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
        process.env.no_proxy = noProxyConfig;
    });
});
