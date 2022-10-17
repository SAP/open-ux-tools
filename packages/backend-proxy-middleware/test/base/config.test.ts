import { getCorporateProxyServer, shouldProxyHost } from '../../src/base/config';

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
            delete process.env.no_proxy;
            expect(shouldProxyHost(host)).toBeTruthy();
        });

        test('host is not excluded via no_proxy config', () => {
            process.env.no_proxy = 'host,www';
            expect(shouldProxyHost(host)).toBeTruthy();
        });

        test('host is not excluded via no_proxy config but has similar ending', () => {
            process.env.no_proxy = 'ample';
            expect(shouldProxyHost(host)).toBeTruthy();
            process.env.no_proxy = 'ost.example';
            expect(shouldProxyHost(host)).toBeTruthy();
        });

        test('host is not excluded via no_proxy config, because no leading dot', () => {
            process.env.no_proxy = 'host.example';
            expect(shouldProxyHost(host)).toBeTruthy();
            process.env.no_proxy = 'example';
            expect(shouldProxyHost(host)).toBeTruthy();
        });

        test('host is excluded via no_proxy config, with leading .', () => {
            process.env.no_proxy = '.host.example';
            expect(shouldProxyHost(host)).toBeFalsy();
            process.env.no_proxy = '.example';
            expect(shouldProxyHost(host)).toBeFalsy();
        });

        test('host is excluded via no_proxy config, full host', () => {
            process.env.no_proxy = 'www.host.example';
            expect(shouldProxyHost(host)).toBeFalsy();
        });

        test('all hosts are excluded from proxy', () => {
            process.env.no_proxy = '*';
            expect(shouldProxyHost(host)).toBeFalsy();
        });

        test('host with port is not excluded from proxy, no leading dot', () => {
            process.env.no_proxy = 'host.example';
            expect(shouldProxyHost(`${host}:3333`)).toBeTruthy();
        });

        test('host with port is excluded from proxy, when all ports are excluded, with leading dot', () => {
            process.env.no_proxy = '.host.example';
            expect(shouldProxyHost(`${host}:3333`)).toBeFalsy();
        });

        test('host with port is excluded from proxy, when all ports are excluded, full host', () => {
            process.env.no_proxy = 'www.host.example';
            expect(shouldProxyHost(`${host}:3333`)).toBeFalsy();
        });

        test('only host with specific port is excluded from proxy, with leading dot', () => {
            process.env.no_proxy = '.host.example:3333';
            expect(shouldProxyHost(`${host}:3333`)).toBeFalsy();
            expect(shouldProxyHost(host)).toBeTruthy();
        });

        test('only host with specific port is excluded from proxy, full host', () => {
            process.env.no_proxy = 'www.host.example:3333';
            expect(shouldProxyHost(`${host}:3333`)).toBeFalsy();
            expect(shouldProxyHost(host)).toBeTruthy();
        });

        test('host with default port is excluded from proxy', () => {
            process.env.no_proxy = '.host.example:80';
            expect(shouldProxyHost(`${host}:80`)).toBeFalsy();
            expect(shouldProxyHost(`${host}`)).toBeFalsy();
        });
    });
});
