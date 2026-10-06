import {
    generateUI5YamlContent,
    generateUI5LocalYamlContent,
    generateUI5MockYamlContent,
    initI18n
} from '@sap-ux/fiori-migration-writer';
import type { TemplateData } from '@sap-ux/fiori-migration-writer';
import { parse } from 'yaml';

jest.setTimeout(30000);

beforeAll(async () => {
    await initI18n();
});

// Helper to create minimal valid TemplateData
const createTemplateData = (overrides: Partial<TemplateData> = {}): TemplateData => {
    return {
        project: { name: 'test-app' },
        service: { servicePath: '/sap/opu/odata/sap/TEST_SERVICE' },
        ui5Yaml: { name: 'test-app', ui5Url: 'https://ui5.sap.com' },
        ...overrides
    };
};

describe('UI5 Config Adapter - generateUI5YamlContent', () => {
    test('should generate basic ui5.yaml with minimal config', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5YamlContent(templateData);

        expect(result).toBeTruthy();
        expect(result).toContain('test-app');
        expect(result).toContain('application');
    });

    test('should include fiori-tools-proxy middleware', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                proxyPath: '/sap',
                proxyHost: 'https://example.com'
            }
        });

        const result = await generateUI5YamlContent(templateData);
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        expect(proxyMiddleware).toBeDefined();
        expect(proxyMiddleware.configuration.backend).toHaveLength(1);
        expect(proxyMiddleware.configuration.backend[0].path).toBe('/sap');
        expect(proxyMiddleware.configuration.backend[0].url).toBe('https://example.com');
    });

    test('should include fiori-tools-appreload middleware', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5YamlContent(templateData);
        const parsed = parse(result);

        const appreloadMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-appreload');
        expect(appreloadMiddleware).toBeDefined();
    });

    test('should include fiori-tools-preview middleware when appId is configured', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                appId: 'com.example.myapp',
                ui5Theme: 'sap_fiori_3'
            }
        });

        const result = await generateUI5YamlContent(templateData);
        const parsed = parse(result);

        const previewMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-preview');
        expect(previewMiddleware).toBeDefined();
        expect(previewMiddleware.configuration.component).toBe('com.example.myapp');
        expect(previewMiddleware.configuration.ui5Theme).toBe('sap_fiori_3');
    });

    test('should not include preview middleware when appId is missing', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5YamlContent(templateData);
        const parsed = parse(result);

        const previewMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-preview');
        expect(previewMiddleware).toBeUndefined();
    });

    test('should include UI5 version in proxy when setUI5Version is true', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        });

        const result = await generateUI5YamlContent(
            templateData,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            true
        );
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        expect(proxyMiddleware.configuration.ui5.version).toBe('1.120.0');
    });

    test('should not add a framework section when including the UI5 proxy version', async () => {
        const templateData = createTemplateData({
            project: { name: 'test-app', ui5Version: '1.120.0' },
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0',
                sapUiLibs: ['sap.m']
            }
        });

        const result = await generateUI5YamlContent(
            templateData,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            true
        );
        const parsed = parse(result);
        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');

        expect(parsed.framework).toBeUndefined();
        expect(proxyMiddleware.configuration.ui5.version).toBe('1.120.0');
    });

    test('should not include UI5 version in proxy when setUI5Version is false', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        });

        const result = await generateUI5YamlContent(
            templateData,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false
        );
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        expect(proxyMiddleware.configuration.ui5.version).toBeUndefined();
    });

    test('should apply webappPath when provided', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5YamlContent(templateData, undefined, undefined, undefined, undefined, 'webapp');

        expect(result).toContain('webapp');
    });

    test('should handle backend with destination', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                destination: 'MY_DESTINATION',
                scp: true
            }
        });

        const result = await generateUI5YamlContent(templateData);
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        expect(proxyMiddleware.configuration.backend[0].destination).toBe('MY_DESTINATION');
        expect(proxyMiddleware.configuration.backend[0].scp).toBe(true);
    });

    test('should use lowercase app name', async () => {
        const templateData = createTemplateData({
            project: { name: 'TestApp' },
            ui5Yaml: { name: 'TestApp', ui5Url: 'https://ui5.sap.com' }
        });

        const result = await generateUI5YamlContent(templateData);
        expect(result).toContain('testapp');
    });

    test('should fallback to "app" when name is missing', async () => {
        const templateData = createTemplateData({
            project: {},
            ui5Yaml: { ui5Url: 'https://ui5.sap.com' }
        });

        const result = await generateUI5YamlContent(templateData);
        expect(result).toContain('app');
    });
});

describe('UI5 Config Adapter - generateUI5LocalYamlContent', () => {
    test('should generate ui5-local.yaml content', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                proxyPath: '/sap',
                proxyHost: 'https://example.com'
            }
        });

        const result = await generateUI5LocalYamlContent(templateData);
        expect(result).toBeTruthy();
        expect(result).toContain('test-app');
        expect(result).toContain('application');
    });

    test('should not include UI5 version in ui5-local.yaml', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        });

        const result = await generateUI5LocalYamlContent(templateData);
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        // ui5-local.yaml should not have the ui5 proxy section at all
        expect(proxyMiddleware.configuration.ui5).toBeUndefined();
    });
});

describe('UI5 Config Adapter - generateUI5MockYamlContent', () => {
    test('should generate basic ui5-mock.yaml', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5MockYamlContent(templateData);

        expect(result).toBeTruthy();
        expect(result).toContain('test-app');
        expect(result).toContain('application');
    });

    test('should not have backend configurations in mock yaml', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5MockYamlContent(templateData);

        // Mock YAML should not contain backend configurations
        expect(result).not.toContain('destination');
        expect(result).not.toContain('proxyHost');
    });

    test('should include UI5 version when setUI5Version is true', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        });

        const result = await generateUI5MockYamlContent(templateData, undefined, true);
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        expect(proxyMiddleware.configuration.ui5.version).toBe('1.120.0');
    });

    test('should not include UI5 version when setUI5Version is false', async () => {
        const templateData = createTemplateData({
            ui5Yaml: {
                name: 'test-app',
                ui5Url: 'https://ui5.sap.com',
                ui5Version: '1.120.0'
            }
        });

        const result = await generateUI5MockYamlContent(templateData, undefined, false);
        const parsed = parse(result);

        const proxyMiddleware = parsed.server.customMiddleware.find((m: any) => m.name === 'fiori-tools-proxy');
        expect(proxyMiddleware.configuration.ui5.version).toBeUndefined();
    });

    test('should apply webappPath when provided', async () => {
        const templateData = createTemplateData();
        const result = await generateUI5MockYamlContent(templateData, 'webapp');

        expect(result).toContain('webapp');
    });
});
