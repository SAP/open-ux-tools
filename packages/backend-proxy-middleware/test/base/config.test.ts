import { updateProxyEnv } from '../../src/base/config.js';

describe('config', () => {
    const corporateProxy = 'https://myproxy.example:8443';

    describe('updateProxyEnv', () => {
        afterEach(() => {
            delete process.env.http_proxy;
            delete process.env.https_proxy;
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
        });

        test('set value from CLI (wins over input)', () => {
            process.argv.push(`proxy=${corporateProxy}`);
            updateProxyEnv('~not.used');
            expect(process.env.http_proxy).toEqual(corporateProxy);
            expect(process.env.https_proxy).toEqual(corporateProxy);
            process.argv.pop();
        });
        test('set value from input when no env is set', () => {
            updateProxyEnv(corporateProxy);
            expect(process.env.http_proxy).toEqual(corporateProxy);
            expect(process.env.https_proxy).toEqual(corporateProxy);
        });
        test('set value from env (wins over input)', () => {
            const envProxy = process.env.FIORI_TOOLS_PROXY;
            process.env.FIORI_TOOLS_PROXY = corporateProxy;
            updateProxyEnv('~not.used');
            expect(process.env.http_proxy).toEqual(corporateProxy);
            expect(process.env.https_proxy).toEqual(corporateProxy);
            if (envProxy === undefined) {
                delete process.env.FIORI_TOOLS_PROXY;
            } else {
                process.env.FIORI_TOOLS_PROXY = envProxy;
            }
        });
        test('promotes legacy npm_config_proxy into standard vars when no standard env is set', () => {
            process.env.npm_config_proxy = corporateProxy;
            updateProxyEnv();
            expect(process.env.http_proxy).toEqual(corporateProxy);
            expect(process.env.https_proxy).toEqual(corporateProxy);
        });
        test('standard env wins over npm_config_proxy (no promotion)', () => {
            const standard = 'https://standard.proxy:3128';
            process.env.http_proxy = standard;
            process.env.npm_config_proxy = corporateProxy;
            updateProxyEnv();
            expect(process.env.http_proxy).toEqual(standard);
        });
    });
});
