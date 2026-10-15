/**
 * Integration tests for ui5-config-adapter with reuse library shims
 */
import {
    generateUI5YamlContent,
    generateUI5LocalYamlContent,
    initI18n,
    type UI5YamlOptions
} from '../../../src/index.js';
import type { TemplateData, ProjectFolder } from '../../../src/types.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'yaml';

jest.setTimeout(30000);

let testDir: string;

beforeAll(async () => {
    await initI18n();
});

beforeEach(() => {
    testDir = join(tmpdir(), `ui5-adapter-reuse-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
    try {
        rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
        // Ignore cleanup errors
    }
});

describe('UI5 Config Adapter - generateUI5YamlContent with reuse libs', () => {
    test('should include reuse library shims in ui5.yaml customConfiguration', async () => {
        const projectRoot = join(testDir, 'myapp');
        const libRoot = join(testDir, 'libs', 'mylib');

        mkdirSync(projectRoot, { recursive: true });
        mkdirSync(join(libRoot, 'src', 'com', 'example', 'mylib'), { recursive: true });
        writeFileSync(
            join(libRoot, 'src', 'com', 'example', 'mylib', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.mylib', type: 'library' } })
        );

        const templateData: TemplateData = {
            project: {
                name: 'myapp',
                reuseLibs: 'com.example.mylib'
            },
            service: {},
            ui5Yaml: {
                name: 'myapp',
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                ui5Url: 'https://ui5.sap.com'
            }
        } as TemplateData;

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const options: UI5YamlOptions = {
            templateData,
            projectRoot,
            workspaceFolders
        };

        const yamlContent = await generateUI5YamlContent(options);
        const parsed = parse(yamlContent);

        expect(parsed.customConfiguration).toBeDefined();
        expect(parsed.customConfiguration['sap.watt.common.plugin.fioriOptions']).toBeDefined();
        expect(parsed.customConfiguration['sap.watt.common.plugin.fioriOptions'].reuseLibs).toBeDefined();
        expect(
            parsed.customConfiguration['sap.watt.common.plugin.fioriOptions'].reuseLibs['com.example.mylib']
        ).toBeDefined();
    });

    test('should not include customConfiguration when no reuse libs found', async () => {
        const projectRoot = join(testDir, 'myapp');
        mkdirSync(projectRoot, { recursive: true });

        const templateData: TemplateData = {
            project: {
                name: 'myapp',
                reuseLibs: 'com.example.nonexistent'
            },
            service: {},
            ui5Yaml: {
                name: 'myapp',
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                ui5Url: 'https://ui5.sap.com'
            }
        } as TemplateData;

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const options: UI5YamlOptions = {
            templateData,
            projectRoot,
            workspaceFolders
        };

        const yamlContent = await generateUI5YamlContent(options);
        const parsed = parse(yamlContent);

        // Should not have customConfiguration for fioriOptions when no libs found
        expect(parsed.customConfiguration?.['sap.watt.common.plugin.fioriOptions']?.reuseLibs).toBeUndefined();
    });

    test('should work without projectRoot or workspaceFolders', async () => {
        const templateData: TemplateData = {
            project: {
                name: 'myapp'
            },
            service: {},
            ui5Yaml: {
                name: 'myapp',
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                ui5Url: 'https://ui5.sap.com'
            }
        } as TemplateData;

        const options: UI5YamlOptions = {
            templateData
        };

        const yamlContent = await generateUI5YamlContent(options);
        expect(yamlContent).toBeDefined();
        expect(yamlContent).toContain('specVersion');
    });
});

describe('UI5 Config Adapter - generateUI5LocalYamlContent with reuse libs', () => {
    test('should include reuse library shims in ui5-local.yaml', async () => {
        const projectRoot = join(testDir, 'myapp');
        const libRoot = join(testDir, 'libs', 'testlib');

        mkdirSync(projectRoot, { recursive: true });
        mkdirSync(join(libRoot, 'src', 'com', 'test', 'lib'), { recursive: true });
        writeFileSync(
            join(libRoot, 'src', 'com', 'test', 'lib', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.test.lib', type: 'library' } })
        );

        const templateData: TemplateData = {
            project: {
                name: 'myapp',
                localUI5Version: '1.120.0',
                reuseLibs: 'com.test.lib'
            },
            service: {},
            ui5Yaml: {
                name: 'myapp',
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                sapUiLibs: ['sap.m', 'sap.ui.core']
            }
        } as TemplateData;

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const options: UI5YamlOptions = {
            templateData,
            projectRoot,
            workspaceFolders
        };

        const yamlContent = await generateUI5LocalYamlContent(options);
        const parsed = parse(yamlContent);

        expect(parsed.customConfiguration).toBeDefined();
        expect(parsed.customConfiguration['sap.watt.common.plugin.fioriOptions']).toBeDefined();
        expect(parsed.customConfiguration['sap.watt.common.plugin.fioriOptions'].reuseLibs).toBeDefined();
        expect(
            parsed.customConfiguration['sap.watt.common.plugin.fioriOptions'].reuseLibs['com.test.lib']
        ).toBeDefined();
    });

    test('should work without reuse libs', async () => {
        const templateData: TemplateData = {
            project: {
                name: 'myapp',
                localUI5Version: '1.120.0'
            },
            service: {},
            ui5Yaml: {
                name: 'myapp',
                proxyPath: '/sap',
                proxyHost: 'https://example.com',
                sapUiLibs: ['sap.m']
            }
        } as TemplateData;

        const options: UI5YamlOptions = {
            templateData
        };

        const yamlContent = await generateUI5LocalYamlContent(options);
        expect(yamlContent).toBeDefined();
        expect(yamlContent).toContain('framework');
    });
});
