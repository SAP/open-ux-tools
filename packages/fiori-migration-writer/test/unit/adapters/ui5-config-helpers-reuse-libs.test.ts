/**
 * Integration-style tests for reuse library shims functionality
 * These tests cover the actual getReuseLibs discovery logic
 */
import { buildReuseLibsShims, addReuseLibsShimsToConfig, initI18n } from '../../../src/index.js';
import type { TemplateData, ProjectFolder } from '../../../src/types.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

jest.setTimeout(30000);

let testDir: string;

beforeAll(async () => {
    await initI18n();
});

beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `ui5-reuse-libs-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
    // Clean up test directory
    try {
        rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
        // Ignore cleanup errors
    }
});

describe('UI5 Config Helpers - buildReuseLibsShims integration tests', () => {
    test('should discover and map reuse libraries from workspace', async () => {
        // Create test project structure
        const projectRoot = join(testDir, 'myproject');
        const lib1Root = join(testDir, 'libs', 'lib1');
        const lib2Root = join(testDir, 'libs', 'lib2');

        // Create project
        mkdirSync(join(projectRoot, 'webapp'), { recursive: true });
        writeFileSync(
            join(projectRoot, 'webapp', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.myapp' } })
        );

        // Create lib1 with manifest
        mkdirSync(join(lib1Root, 'src', 'com', 'example', 'lib1'), { recursive: true });
        writeFileSync(
            join(lib1Root, 'src', 'com', 'example', 'lib1', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.lib1', type: 'library' } })
        );

        // Create lib2 with manifest
        mkdirSync(join(lib2Root, 'src', 'com', 'example', 'lib2'), { recursive: true });
        writeFileSync(
            join(lib2Root, 'src', 'com', 'example', 'lib2', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.lib2', type: 'library' } })
        );

        const templateData: Partial<TemplateData> = {
            project: {
                reuseLibs: 'com.example.lib1,com.example.lib2'
            }
        };

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const result = await buildReuseLibsShims(templateData, projectRoot, workspaceFolders);

        expect(result).toBeDefined();
        expect(result?.reuseLibs).toBeDefined();
        expect(result?.reuseLibs['com.example.lib1']).toBeDefined();
        expect(result?.reuseLibs['com.example.lib2']).toBeDefined();
        expect(Array.isArray(result?.reuseLibs['com.example.lib1'])).toBe(true);
        expect(result?.reuseLibs['com.example.lib1'].length).toBeGreaterThan(0);
    });

    test('should handle library not found gracefully', async () => {
        const projectRoot = join(testDir, 'myproject');
        mkdirSync(projectRoot, { recursive: true });

        const templateData: Partial<TemplateData> = {
            project: {
                reuseLibs: 'com.example.nonexistent'
            }
        };

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const result = await buildReuseLibsShims(templateData, projectRoot, workspaceFolders);

        // Should return undefined when no libraries found
        expect(result).toBeUndefined();
    });

    test('should return only found libraries when some are missing', async () => {
        const projectRoot = join(testDir, 'myproject');
        const lib1Root = join(testDir, 'libs', 'lib1');

        mkdirSync(projectRoot, { recursive: true });

        // Create only lib1
        mkdirSync(join(lib1Root, 'src', 'com', 'example', 'lib1'), { recursive: true });
        writeFileSync(
            join(lib1Root, 'src', 'com', 'example', 'lib1', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.lib1', type: 'library' } })
        );

        const templateData: Partial<TemplateData> = {
            project: {
                reuseLibs: 'com.example.lib1,com.example.missing'
            }
        };

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const result = await buildReuseLibsShims(templateData, projectRoot, workspaceFolders);

        expect(result).toBeDefined();
        expect(result?.reuseLibs['com.example.lib1']).toBeDefined();
        expect(result?.reuseLibs['com.example.missing']).toBeUndefined();
    });

    test('should calculate correct relative paths', async () => {
        const projectRoot = join(testDir, 'project');
        const libRoot = join(testDir, 'shared', 'libs', 'mylib');

        mkdirSync(projectRoot, { recursive: true });
        mkdirSync(join(libRoot, 'src', 'com', 'example', 'mylib'), { recursive: true });
        writeFileSync(
            join(libRoot, 'src', 'com', 'example', 'mylib', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.mylib', type: 'library' } })
        );

        const templateData: Partial<TemplateData> = {
            project: {
                reuseLibs: 'com.example.mylib'
            }
        };

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        const result = await buildReuseLibsShims(templateData, projectRoot, workspaceFolders);

        expect(result).toBeDefined();
        const paths = result?.reuseLibs['com.example.mylib'];
        expect(paths).toBeDefined();
        expect(paths![0]).toContain('..');
        expect(paths![0]).toContain('shared');
    });
});

describe('UI5 Config Helpers - addReuseLibsShimsToConfig integration tests', () => {
    test('should add configuration when libraries are discovered', async () => {
        const projectRoot = join(testDir, 'project');
        const libRoot = join(testDir, 'libs', 'mylib');

        mkdirSync(projectRoot, { recursive: true });
        mkdirSync(join(libRoot, 'src', 'com', 'example', 'mylib'), { recursive: true });
        writeFileSync(
            join(libRoot, 'src', 'com', 'example', 'mylib', 'manifest.json'),
            JSON.stringify({ 'sap.app': { id: 'com.example.mylib', type: 'library' } })
        );

        const mockConfig = {
            addCustomConfiguration: jest.fn()
        };

        const templateData: Partial<TemplateData> = {
            project: {
                reuseLibs: 'com.example.mylib'
            }
        };

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        await addReuseLibsShimsToConfig(mockConfig, templateData, projectRoot, workspaceFolders);

        expect(mockConfig.addCustomConfiguration).toHaveBeenCalledWith(
            'sap.watt.common.plugin.fioriOptions',
            expect.objectContaining({
                reuseLibs: expect.objectContaining({
                    'com.example.mylib': expect.any(Array)
                })
            })
        );
    });

    test('should not add configuration when discovery fails', async () => {
        const projectRoot = join(testDir, 'project');
        mkdirSync(projectRoot, { recursive: true });

        const mockConfig = {
            addCustomConfiguration: jest.fn()
        };

        const templateData: Partial<TemplateData> = {
            project: {
                reuseLibs: 'com.example.nonexistent'
            }
        };

        const workspaceFolders: ProjectFolder[] = [
            {
                uri: { fsPath: testDir, scheme: 'file' },
                name: 'workspace',
                index: 0
            }
        ];

        await addReuseLibsShimsToConfig(mockConfig, templateData, projectRoot, workspaceFolders);

        expect(mockConfig.addCustomConfiguration).not.toHaveBeenCalled();
    });
});
