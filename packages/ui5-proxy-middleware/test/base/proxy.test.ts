import { ui5Proxy } from '../../src';
import * as hpm from 'http-proxy-middleware';
import * as utils from '../../src/base/utils';
import { ToolsLogger } from '@sap-ux/logger';

describe('ui5Proxy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ui5Proxy: creates an ui5 proxy middleware, default params', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
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
    });

    test('ui5Proxy: creates an ui5 proxy middleware, additional params', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
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
    });

    test('ui5Proxy: creates an ui5 proxy middleware, custom filter function', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
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
    });

    test('ui5Proxy: calling onProxyReq calls proxyRequestHandler', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
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
    });

    test('ui5Proxy: calling onProxyRes calls proxyResponseHandler', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
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
    });

    test('ui5Proxy: calling onError calls proxyErrorHandler', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
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
    });
});
