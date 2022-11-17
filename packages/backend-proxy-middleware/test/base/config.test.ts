import { updateProxyEnv } from '../../src/base/config';

describe('config', () => {
    const corporateProxy = 'https://myproxy.example:8443';

    describe('updateProxyEnv', () => {
        afterEach(() => {
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
        });

        test('set value from CLI (wins over input)', () => {
            process.argv.push(`proxy=${corporateProxy}`);
            updateProxyEnv('~not.used');
            expect(process.env.npm_config_proxy).toEqual(corporateProxy);
            expect(process.env.npm_config_https_proxy).toEqual(corporateProxy);
            process.argv.pop();
        });
        test('set value from input when no env is set', () => {
            updateProxyEnv(corporateProxy);
            expect(process.env.npm_config_proxy).toEqual(corporateProxy);
            expect(process.env.npm_config_https_proxy).toEqual(corporateProxy);
        });
        test('set value from env (wins over input)', () => {
            const envProxy = process.env.FIORI_TOOLS_PROXY;
            process.env.FIORI_TOOLS_PROXY = corporateProxy;
            updateProxyEnv('~not.used');
            expect(process.env.npm_config_proxy).toEqual(corporateProxy);
            expect(process.env.npm_config_https_proxy).toEqual(corporateProxy);
            process.env.FIORI_TOOLS_PROXY = envProxy;
        });
    });
});
