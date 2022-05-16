import { getCorporateProxyServer, isHostExcludedFromProxy } from '../../src/base/config';

describe('config', () => {
    const corporateProxy = 'https://myproxy.example:8443';

    describe('getCorporateProxyServer', () => {
        test('get value from CLI (wins over input)', () => {
            process.argv.push(`proxy=${corporateProxy}`);
            expect(getCorporateProxyServer('~not.used')).toEqual(corporateProxy);
            process.argv.pop();
        });
        test('get value from input (wins over env)', () => {
            const envProxy = process.env.npm_config_https_proxy;
            process.env.npm_config_https_proxy = '~not.used';
            expect(getCorporateProxyServer(corporateProxy)).toEqual(corporateProxy);
            process.env.npm_config_https_proxy = envProxy;
        });
        test('get value from env if there is no input', () => {
            const envProxy = process.env.npm_config_https_proxy;
            process.env.npm_config_https_proxy = corporateProxy;
            expect(getCorporateProxyServer(undefined)).toEqual(corporateProxy);
            process.env.npm_config_https_proxy = envProxy;
        });
    });

    describe('isHostExcludedFromProxy', () => {
        const host = 'http://www.host.example';
        const noProxyConfig = process.env.no_proxy;

        afterEach(() => {
            process.env.no_proxy = noProxyConfig;
        });

        test('no_proxy config does not exist', () => {
            process.env.no_proxy = undefined;
            expect(isHostExcludedFromProxy(host)).toBeFalsy();
        });

        test('host is not excluded via no_proxy config', () => {
            process.env.no_proxy = 'host,www';
            expect(isHostExcludedFromProxy(host)).toBeFalsy();
        });

        test('host is not excluded via no_proxy config but has similar ending', () => {
            process.env.no_proxy = 'ample';
            expect(isHostExcludedFromProxy(host)).toBeFalsy();
            process.env.no_proxy = 'ost.example';
            expect(isHostExcludedFromProxy(host)).toBeFalsy();
        });

        test('host is excluded via no_proxy config', () => {
            process.env.no_proxy = 'host.example';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
            process.env.no_proxy = 'example';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
        });

        test('host is excluded via no_proxy config, bit with leading .', () => {
            process.env.no_proxy = '.host.example';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
            process.env.no_proxy = '.example';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
        });

        test('all hosts are excluded from proxy', () => {
            process.env.no_proxy = '*';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
        });
    });
});
