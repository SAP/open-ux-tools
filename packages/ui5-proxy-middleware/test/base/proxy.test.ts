import { ui5Proxy } from '../../src';
import * as hpm from 'http-proxy-middleware';
import * as utils from '../../src/base/utils';
import { ToolsLogger } from '@sap-ux/logger';

describe('ui5Proxy', () => {
    const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ui5Proxy: creates an ui5 proxy middleware, default params', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.objectContaining({
                changeOrigin: true,
                target: 'https://example.example',
                onProxyReq: expect.any(Function),
                onProxyRes: expect.any(Function),
                onError: expect.any(Function),
                pathRewrite: { '/mypath': '/1.0.0/mypath' }
            })
        );
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
    });

    test('ui5Proxy: creates an ui5 proxy middleware, additional params', () => {
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: ''
        };

        const options: hpm.Options = {
            secure: true,
            logLevel: 'debug',
            changeOrigin: false
        };

        ui5Proxy(config, options);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.objectContaining({
                changeOrigin: false,
                secure: true,
                logLevel: 'debug',
                target: 'https://example.example',
                onProxyReq: expect.any(Function),
                onProxyRes: expect.any(Function),
                pathRewrite: { '/mypath': '/mypath' }
            })
        );
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
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
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(customFilterFn, expect.any(Object));
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            customFilterFn,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
    });

    test('ui5Proxy: calling onProxyReq calls proxyRequestHandler', () => {
        const proxyRequestHandlerSpy = jest.spyOn(utils, 'proxyRequestHandler').mockImplementation(jest.fn());
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = createProxyMiddlewareSpy.mock.calls[0][1];
        if (typeof proxyConfig?.onProxyReq === 'function') {
            proxyConfig?.onProxyReq({} as any, {} as any, {} as any, {});
            expect(proxyRequestHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyRequestHandlerSpy).toHaveBeenCalledWith({}, {}, 'W/"1.0.0"', expect.any(ToolsLogger));
        }
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
    });

    test('ui5Proxy: calling onProxyRes calls proxyResponseHandler', () => {
        const proxyResponseHandlerSpy = jest.spyOn(utils, 'proxyResponseHandler').mockImplementation(jest.fn());
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = createProxyMiddlewareSpy.mock.calls[0][1];
        if (typeof proxyConfig?.onProxyRes === 'function') {
            proxyConfig?.onProxyRes({} as any, {} as any, {} as any);
            expect(proxyResponseHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyResponseHandlerSpy).toHaveBeenCalledWith({}, 'W/"1.0.0"');
        }
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
    });

    test('ui5Proxy: calling onError calls proxyErrorHandler', () => {
        const proxyErrorHandlerSpy = jest.spyOn(utils, 'proxyErrorHandler').mockImplementation(jest.fn());
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        ui5Proxy(config);
        const proxyConfig = createProxyMiddlewareSpy.mock.calls[0][1];
        if (typeof proxyConfig?.onError === 'function') {
            const err = new Error();
            proxyConfig?.onError(err as any, {} as any, {} as any);
            expect(proxyErrorHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyErrorHandlerSpy).toHaveBeenCalledWith(err, {}, expect.any(ToolsLogger), {}, undefined);
        }
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
    });

    test('ui5Proxy: host is not excluded from proxy', async () => {
        const config = {
            path: '/mypath',
            url: 'https://ui5.example',
            version: '1.0.0',
            proxy: 'http://proxy.example'
        };
        ui5Proxy(config);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.objectContaining({
                agent: expect.objectContaining({})
            })
        );
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
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
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
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
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
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
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
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledWith(
            utils.filterCompressedHtmlFiles,
            expect.not.objectContaining({
                agent: expect.objectContaining({})
            })
        );
        delete process.env.npm_config_proxy;
        delete process.env.npm_config_https_proxy;
        process.env.no_proxy = noProxyConfig;
    });
});
