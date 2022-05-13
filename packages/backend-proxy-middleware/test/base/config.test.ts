import { getCorporateProxyServer, isHostExcludedFromProxy, mergeConfigWithEnvVariables } from '../../src/base/config';

describe('config', () => {
    test('getCorporateProxyServer: gets proxy configuration of user', () => {
        const corporateProxy = 'https://myproxy:8443';
        expect(getCorporateProxyServer(corporateProxy)).toEqual(corporateProxy);

        const envProxy = process.env.npm_config_https_proxy;
        process.env.npm_config_https_proxy = corporateProxy;
        expect(getCorporateProxyServer(undefined)).toEqual(corporateProxy);
        process.env.npm_config_https_proxy = envProxy;
    });

    describe('isHostExcludedFromProxy', () => {
        const host = 'http://www.host.example';

        test('no_proxy config does not exist', () => {
            expect(isHostExcludedFromProxy(undefined, host)).toBeFalsy();
        });

        test('host is not excluded via no_proxy config', () => {
            expect(isHostExcludedFromProxy('host,www', host)).toBeFalsy();
        });

        test('host is not excluded via no_proxy config but has similar ending', () => {
            expect(isHostExcludedFromProxy('ample', host)).toBeFalsy();
            expect(isHostExcludedFromProxy('ost.example', host)).toBeFalsy();
        });

        test('host is excluded via no_proxy config', () => {
            expect(isHostExcludedFromProxy('host.example', host)).toBeTruthy();
            expect(isHostExcludedFromProxy('example', host)).toBeTruthy();
        });

        test('host is excluded via no_proxy config, bit with leading .', () => {
            expect(isHostExcludedFromProxy('.host.example', host)).toBeTruthy();
            expect(isHostExcludedFromProxy('.example', host)).toBeTruthy();
        });

        test('all hosts are excluded from proxy', () => {
            expect(isHostExcludedFromProxy('*', host)).toBeTruthy();
        });
    });

    describe('mergeConfigWithEnvVariables', () => {
        const env = process.env;
        test('read everything from environment variables', () => {
            // TODO
        });
    });
});
