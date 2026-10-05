import { buildMainBackend, buildProxyConfig, buildPreviewMiddleware, initI18n } from '../src/index.js';
import type { TemplateData } from '../src/types.js';

jest.setTimeout(30000);

beforeAll(async () => {
    await initI18n();
});

describe('UI5 Config Helpers - buildMainBackend', () => {
    test('should return undefined when proxyPath is missing', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyHost: 'https://example.com'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toBeUndefined();
    });

    test('should return undefined when proxyHost is missing', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toBeUndefined();
    });

    test('should build basic backend configuration', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap',
                proxyHost: 'https://example.com:443'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap',
            url: 'https://example.com:443'
        });
    });

    test('should include client when configured', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                client: '100'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap',
            url: 'https://example.com',
            client: '100'
        });
    });

    test('should include apiHub when apiHubApiKey is present', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap',
                proxyHost: 'https://api.sap.com',
                apiHubApiKey: 'test-key-123'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap',
            url: 'https://api.sap.com',
            apiHub: true
        });
    });

    test('should include scp when configured', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                scp: true
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap',
            url: 'https://example.com',
            scp: true
        });
    });

    test('should include destination when configured', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                destination: 'MY_DESTINATION'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap',
            url: 'https://example.com',
            destination: 'MY_DESTINATION'
        });
    });

    test('should include destinationInstance when configured', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                destination: 'MY_DESTINATION',
                destinationInstance: 'my-instance'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap',
            url: 'https://example.com',
            destination: 'MY_DESTINATION',
            destinationInstance: 'my-instance'
        });
    });

    test('should include all optional properties when configured', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                proxyPath: '/sap/opu/odata',
                proxyHost: 'https://example.com:443',
                client: '100',
                apiHubApiKey: 'test-key',
                scp: true,
                destination: 'MY_DEST',
                destinationInstance: 'my-inst'
            }
        };
        const result = buildMainBackend(templateData);
        expect(result).toEqual({
            path: '/sap/opu/odata',
            url: 'https://example.com:443',
            client: '100',
            apiHub: true,
            scp: true,
            destination: 'MY_DEST',
            destinationInstance: 'my-inst'
        });
    });
});

describe('UI5 Config Helpers - buildProxyConfig', () => {
    test('should build basic proxy config without backends', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                ui5Url: 'https://ui5.sap.com'
            }
        };
        const result = buildProxyConfig([], templateData);
        expect(result).toEqual({
            ignoreCertErrors: false,
            backend: [],
            ui5: {
                path: ['/resources', '/test-resources'],
                url: 'https://ui5.sap.com'
            }
        });
    });

    test('should include backends in config', () => {
        const backends = [{ path: '/sap', url: 'https://example.com' }];
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                ui5Url: 'https://ui5.sap.com'
            }
        };
        const result = buildProxyConfig(backends, templateData);
        expect(result.backend).toEqual(backends);
    });

    test('should include UI5 version when setUI5Version is true', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        };
        const result = buildProxyConfig([], templateData, true);
        expect(result.ui5.version).toBe('1.120.0');
    });

    test('should not include UI5 version when setUI5Version is false', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        };
        const result = buildProxyConfig([], templateData, false);
        expect(result.ui5.version).toBeUndefined();
    });

    test('should not include UI5 version when ui5Version is missing', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                ui5Url: 'https://ui5.sap.com'
            }
        };
        const result = buildProxyConfig([], templateData, true);
        expect(result.ui5.version).toBeUndefined();
    });

    test('should use empty string for ui5Url when missing', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {}
        };
        const result = buildProxyConfig([], templateData);
        expect(result.ui5.url).toBe('');
    });
});

describe('UI5 Config Helpers - buildPreviewMiddleware', () => {
    test('should return undefined when appId is missing', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {}
        };
        const result = buildPreviewMiddleware(templateData);
        expect(result).toBeUndefined();
    });

    test('should build preview middleware with appId', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                appId: 'com.example.myapp'
            }
        };
        const result = buildPreviewMiddleware(templateData);
        expect(result).toEqual([
            {
                name: 'fiori-tools-preview',
                afterMiddleware: 'fiori-tools-appreload',
                configuration: {
                    component: 'com.example.myapp',
                    ui5Theme: 'sap_horizon'
                }
            }
        ]);
    });

    test('should use custom UI5 theme when provided', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                appId: 'com.example.myapp',
                ui5Theme: 'sap_fiori_3'
            }
        };
        const result = buildPreviewMiddleware(templateData);
        expect(result![0].configuration.ui5Theme).toBe('sap_fiori_3');
    });

    test('should default to sap_horizon when theme is not provided', () => {
        const templateData: Partial<TemplateData> = {
            ui5Yaml: {
                appId: 'com.example.myapp'
            }
        };
        const result = buildPreviewMiddleware(templateData);
        expect(result![0].configuration.ui5Theme).toBe('sap_horizon');
    });
});
