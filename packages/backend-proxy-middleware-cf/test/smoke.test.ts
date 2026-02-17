import type { BackendProxyMiddlewareCfConfig } from '../src/types';

describe('backend-proxy-middleware-cf', () => {
    test('exports BackendProxyMiddlewareCfConfig type', () => {
        const config: BackendProxyMiddlewareCfConfig = {
            port: 5000,
            xsappJson: './xs-app.json',
            destinations: []
        };
        expect(config.port).toBe(5000);
    });
});
