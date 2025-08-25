import { validateProxySettings } from '../../src/proxyCheck';

describe('Proxy check', () => {
    // Store original environment variables
    const originalEnv = process.env;

    beforeEach(() => {
        // Clear all proxy-related environment variables before each test
        jest.resetModules();
        process.env = { ...originalEnv };
        delete process.env.HTTP_PROXY;
        delete process.env.http_proxy;
        delete process.env.HTTPS_PROXY;
        delete process.env.https_proxy;
    });

    afterAll(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    it('should return no-proxy status', () => {
        const result = validateProxySettings();
        expect(result).toEqual({
            isValid: true,
            status: 'no-proxy',
            message: 'No proxy settings configured.'
        });
    });

    it('should return no-proxy status when proxy parameter is empty string', () => {
        const result = validateProxySettings('');
        expect(result).toEqual({
            isValid: true,
            status: 'no-proxy',
            message: 'No proxy settings configured.'
        });
    });

    it('should return no-proxy status when proxy parameter is only whitespace', () => {
        const result = validateProxySettings('   ');
        expect(result).toEqual({
            isValid: true,
            status: 'no-proxy',
            message: 'No proxy settings configured.'
        });
    });

    it('should return env-only status with HTTPS_PROXY', () => {
        process.env.HTTPS_PROXY = 'https://secure-proxy.company.com:8443/';
        const result = validateProxySettings();
        expect(result).toEqual({
            isValid: false,
            status: 'env-only',
            message: 'Using environment proxy settings.',
            envProxy: 'https://secure-proxy.company.com:8443'
        });
    });

    it('should return param-only status when only proxy parameter is provided', () => {
        const result = validateProxySettings('http://param-proxy.com:3128');
        expect(result).toEqual({
            isValid: false,
            status: 'param-only',
            message: 'Using provided (http://param-proxy.com:3128) proxy settings.',
            providedProxy: 'http://param-proxy.com:3128'
        });
    });

    it('should return mismatch status when proxies differ', () => {
        process.env.HTTP_PROXY = 'http://env-proxy.com:8080';
        const result = validateProxySettings('http://param-proxy.com:3128');
        expect(result).toEqual({
            isValid: false,
            status: 'mismatch',
            message:
                'Proxy settings conflict between environment (http://env-proxy.com:8080) and parameter (http://param-proxy.com:3128).',
            envProxy: 'http://env-proxy.com:8080',
            providedProxy: 'http://param-proxy.com:3128'
        });
    });

    it('should detect mismatch with different protocols', () => {
        process.env.HTTP_PROXY = 'http://proxy.company.com:8080';
        const result = validateProxySettings('https://proxy.company.com:8080');
        expect(result.isValid).toBe(false);
        expect(result.status).toBe('mismatch');
    });

    it('should return match status when environment and parameter proxies are identical', () => {
        process.env.HTTP_PROXY = 'http://proxy.company.com:8080';
        const result = validateProxySettings('http://proxy.company.com:8080');
        expect(result).toEqual({
            isValid: true,
            status: 'match',
            message: 'Proxy settings match.',
            envProxy: 'http://proxy.company.com:8080',
            providedProxy: 'http://proxy.company.com:8080'
        });
    });
});
