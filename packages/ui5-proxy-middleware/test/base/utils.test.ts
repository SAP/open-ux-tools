import {
    getCorporateProxyServer,
    isHostExcludedFromProxy,
    proxyRequestHandler,
    proxyResponseHandler
} from '../../src/base/utils';

describe('Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('proxyResponseHandler', () => {
        const proxyRes = {
            headers: {} as any
        };
        const etag = 'W/MyEtag';
        proxyResponseHandler(proxyRes as any, etag);
        expect(proxyRes.headers['Etag']).toEqual(etag);
        expect(proxyRes.headers['cache-control']).toEqual('no-cache');
    });

    test('proxyRequestHandler', () => {
        const etag = 'W/MyEtag';
        const proxyReq = {
            path: '/mypath',
            getHeader: () => {
                return etag;
            }
        };
        const res = {
            statusCode: undefined,
            end: jest.fn()
        };
        const logger = {
            info: jest.fn()
        };
        proxyRequestHandler(proxyReq as any, res as any, etag, logger as any);
        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('/mypath');
        expect(res.statusCode).toEqual(304);
        expect(res.end).toHaveBeenCalledTimes(1);
    });

    test('getCorporateProxyServer', () => {
        const corporateProxy = 'https://myproxy:8443';
        expect(getCorporateProxyServer(corporateProxy)).toEqual(corporateProxy);

        const envProxy = process.env.npm_config_https_proxy;
        process.env.npm_config_https_proxy = corporateProxy;
        expect(getCorporateProxyServer(undefined)).toEqual(corporateProxy);
        process.env.npm_config_https_proxy = envProxy;
    });

    test('isHostExcludedFromProxy', () => {
        const noProxyConfig = 'example.com';
        const host = 'http://www.example.com';
        expect(isHostExcludedFromProxy(noProxyConfig, host)).toBeTruthy();
        expect(isHostExcludedFromProxy(undefined, host)).toBeFalsy();
    });
});
