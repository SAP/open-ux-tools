import { ui5Proxy } from '../../src';
import * as hpm from 'http-proxy-middleware';
import * as utils from '../../src/base/utils';
import { ToolsLogger } from '@sap-ux/logger';

describe('ui5Proxy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('ui5Proxy: default params', () => {
        const createProxyMiddlewareSpy = jest.spyOn(hpm, 'createProxyMiddleware').mockImplementation(jest.fn());
        const proxyResponseHandlerSpy = jest.spyOn(utils, 'proxyResponseHandler').mockImplementation(jest.fn());
        const proxyRequestHandlerSpy = jest.spyOn(utils, 'proxyRequestHandler').mockImplementation(jest.fn());
        const config = {
            path: '/mypath',
            url: 'https://example.example',
            version: '1.0.0'
        };

        const req = {
            headers: {
                accept: 'text/html',
                'accept-encoding': 'gzip'
            }
        };

        ui5Proxy(config);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        const defaultFilterFn = createProxyMiddlewareSpy.mock.calls[0][0];
        expect(defaultFilterFn).toEqual(expect.any(Function));
        const expectedOptions = createProxyMiddlewareSpy.mock.calls[0][1];
        expect(expectedOptions?.changeOrigin).toBeTruthy();
        expect(expectedOptions?.selfHandleResponse).toBeTruthy();
        expect(expectedOptions?.target).toEqual('https://example.example');
        expect(expectedOptions?.onProxyReq).toEqual(expect.any(Function));
        expect(expectedOptions?.onProxyRes).toEqual(expect.any(Function));
        expect(expectedOptions?.pathRewrite).toEqual({ '/mypath': '/1.0.0/mypath' });

        if (typeof defaultFilterFn === 'function') {
            defaultFilterFn('', req as any);
            expect(req.headers['accept-encoding']).toBeUndefined();
        }

        if (typeof expectedOptions?.onProxyRes === 'function') {
            expectedOptions.onProxyRes({} as any, {} as any, {} as any);
            expect(proxyResponseHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyResponseHandlerSpy).toHaveBeenCalledWith({}, 'W/"1.0.0"');
        }

        if (typeof expectedOptions?.onProxyReq === 'function') {
            expectedOptions?.onProxyReq({} as any, {} as any, {} as any, {});
            expect(proxyRequestHandlerSpy).toHaveBeenCalledTimes(1);
            expect(proxyRequestHandlerSpy).toHaveBeenCalledWith({}, {}, 'W/"1.0.0"', expect.any(ToolsLogger));
        }
    });

    test('ui5Proxy: additional options', () => {
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
        const req = {
            headers: {
                'accept-encoding': 'gzip'
            }
        };
        ui5Proxy(config, options);
        expect(createProxyMiddlewareSpy).toHaveBeenCalledTimes(1);
        const defaultFilterFn = createProxyMiddlewareSpy.mock.calls[0][0];
        expect(defaultFilterFn).toEqual(expect.any(Function));
        const expectedOptions = createProxyMiddlewareSpy.mock.calls[0][1];
        expect(expectedOptions?.changeOrigin).toBeFalsy();
        expect(expectedOptions?.secure).toBeTruthy();
        expect(expectedOptions?.pathRewrite).toEqual({ '/mypath': '/mypath' });

        if (typeof defaultFilterFn === 'function') {
            defaultFilterFn('', req as any);
            expect(req.headers['accept-encoding']).toEqual('gzip');
        }
    });

    test('ui5Proxy: custom filter', () => {
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
        const defaultFilterFn = createProxyMiddlewareSpy.mock.calls[0][0];
        expect(defaultFilterFn).toEqual(customFilterFn);
    });
});
