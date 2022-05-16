import { getCorporateProxyServer, isHostExcludedFromProxy, mergeConfigWithEnvVariables } from '../../src/base/config';

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
        const envString = JSON.stringify(process.env);

        afterEach(() => {
            process.env = JSON.parse(envString);
        });

        test('read everything from environment variables', () => {
            process.env.HTTP_PROXY = 'http://proxy.example';
            process.env.no_proxy = 'noproxy.example';
            process.env.FIORI_TOOLS_BACKEND_CONFIG = JSON.stringify([{ url: 'http://backend.example' }]);

            const config = mergeConfigWithEnvVariables({});

            expect(config.proxy).toBe(process.env.HTTP_PROXY);
            expect(config.noProxyList).toBe(process.env.no_proxy);
            expect(JSON.stringify(config.backend)).toBe(process.env.FIORI_TOOLS_BACKEND_CONFIG);
            expect(config.secure).toBe(true);
        });
    });
});
