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
            const envProxy = process.env.FIORI_TOOLS_PROXY;
            process.env.FIORI_TOOLS_PROXY = '~not.used';
            expect(getCorporateProxyServer(corporateProxy)).toEqual(corporateProxy);
            process.env.FIORI_TOOLS_PROXY = envProxy;
        });
        test('get value from env if there is no input', () => {
            const envProxy = process.env.FIORI_TOOLS_PROXY;
            process.env.FIORI_TOOLS_PROXY = corporateProxy;
            expect(getCorporateProxyServer(undefined)).toEqual(corporateProxy);
            process.env.FIORI_TOOLS_PROXY = envProxy;
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

        test('host is excluded via no_proxy config, but with leading .', () => {
            process.env.no_proxy = '.host.example';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
            process.env.no_proxy = '.example';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
        });

        test('all hosts are excluded from proxy', () => {
            process.env.no_proxy = '*';
            expect(isHostExcludedFromProxy(host)).toBeTruthy();
        });

        test('host with port is excluded from proxy, when all ports are excluded', () => {
            process.env.no_proxy = 'host.example';
            expect(isHostExcludedFromProxy(`${host}:3333`)).toBeTruthy();
        });

        test('host with port is excluded from proxy, when all ports are excluded, but with leading dot', () => {
            process.env.no_proxy = '.host.example';
            expect(isHostExcludedFromProxy(`${host}:3333`)).toBeTruthy();
        });

        test('only host with specific port is excluded from proxy', () => {
            process.env.no_proxy = 'host.example:3333';
            expect(isHostExcludedFromProxy(`${host}:3333`)).toBeTruthy();
            expect(isHostExcludedFromProxy(host)).toBeFalsy();
        });

        test('only host with specific port is excluded from proxy, but with leading dot', () => {
            process.env.no_proxy = '.host.example:3333';
            expect(isHostExcludedFromProxy(`${host}:3333`)).toBeTruthy();
            expect(isHostExcludedFromProxy(host)).toBeFalsy();
        });

        test('host with default port is excluded from proxy', () => {
            process.env.no_proxy = 'host.example:80';
            expect(isHostExcludedFromProxy(`${host}:80`)).toBeTruthy();
        });
    });
});
