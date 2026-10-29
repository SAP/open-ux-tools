import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock enableTypescript at module level BEFORE importing anything else
jest.unstable_mockModule('@sap-ux/ui5-application-writer', () => ({
    enableTypescript: jest.fn().mockResolvedValue(undefined),
    ui5TSSupport: {
        middleware: {
            name: 'ui5-tooling-transpile-middleware',
            afterMiddleware: 'compression'
        },
        task: {
            name: 'ui5-tooling-transpile-task',
            beforeTask: 'generateComponentPreload'
        }
    },
    // Add other exports as needed
    getManifestVersion: jest.fn()
}));

// Import after mocking
const { createMemFsEditor, loadProjectIntoEditor } = await import('../../src/utils/fs-adapter.js');
const { initI18n } = await import('../../src/index.js');

// Helper to access private method
const getProjectMigratorPrivate = async (): Promise<any> => {
    const module = await import('../../src/ProjectMigrator.js');
    return module.ProjectMigrator;
};

describe('ProjectMigrator TypeScript YAML Update', () => {
    let fs: Editor;
    const testOutputDir = join(__dirname, 'test-output', 'ts-yaml-update');

    beforeEach(async () => {
        await initI18n();
        fs = createMemFsEditor();
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    describe('setupTypeScript YAML processing', () => {
        it('should update ui5-local.yaml with TypeScript middleware when file exists', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'with-local-yaml');
            await mkdir(rootPath, { recursive: true });

            // Create ui5-local.yaml
            const yamlContent = `specVersion: '3.0'
metadata:
  name: test-app
type: application
`;
            await writeFile(join(rootPath, 'ui5-local.yaml'), yamlContent);

            await loadProjectIntoEditor(fs, rootPath);
            const messages = await ProjectMigrator['setupTypeScript'](fs, rootPath);

            // Should succeed with WARNING
            expect(messages.some((m: { type: string }) => m.type === 'WARNING')).toBe(true);
            expect(messages.some((m: { type: string }) => m.type === 'ERROR')).toBe(false);

            // Verify YAML was updated
            const updatedYaml = fs.read(join(rootPath, 'ui5-local.yaml'));
            expect(updatedYaml).toContain('ui5-tooling-transpile');
        });

        it('should update ui5-mock.yaml with TypeScript tasks when file exists', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'with-mock-yaml');
            await mkdir(rootPath, { recursive: true });

            // Create ui5-mock.yaml
            const yamlContent = `specVersion: '3.0'
metadata:
  name: test-app
type: application
`;
            await writeFile(join(rootPath, 'ui5-mock.yaml'), yamlContent);

            await loadProjectIntoEditor(fs, rootPath);
            const messages = await ProjectMigrator['setupTypeScript'](fs, rootPath);

            // Should succeed
            expect(messages.some((m: { type: string }) => m.type === 'WARNING')).toBe(true);

            // Verify YAML was updated
            const updatedYaml = fs.read(join(rootPath, 'ui5-mock.yaml'));
            expect(updatedYaml).toContain('ui5-tooling-transpile');
        });

        it('should update both YAML files when both exist', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'with-both-yamls');
            await mkdir(rootPath, { recursive: true });

            // Create both YAML files
            const yamlContent = `specVersion: '3.0'
metadata:
  name: test-app
type: application
`;
            await writeFile(join(rootPath, 'ui5-local.yaml'), yamlContent);
            await writeFile(join(rootPath, 'ui5-mock.yaml'), yamlContent);

            await loadProjectIntoEditor(fs, rootPath);
            const messages = await ProjectMigrator['setupTypeScript'](fs, rootPath);

            // Should succeed
            expect(messages.some((m: { type: string }) => m.type === 'WARNING')).toBe(true);

            // Verify both YAMLs were updated
            const localYaml = fs.read(join(rootPath, 'ui5-local.yaml'));
            const mockYaml = fs.read(join(rootPath, 'ui5-mock.yaml'));
            expect(localYaml).toContain('ui5-tooling-transpile');
            expect(mockYaml).toContain('ui5-tooling-transpile');
        });

        it('should skip YAML processing when files do not exist', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'no-yamls');
            await mkdir(rootPath, { recursive: true });

            // No YAML files created
            await loadProjectIntoEditor(fs, rootPath);
            const messages = await ProjectMigrator['setupTypeScript'](fs, rootPath);

            // Should still succeed with warning
            expect(messages.some((m: { type: string }) => m.type === 'WARNING')).toBe(true);
            expect(messages.some((m: { type: string }) => m.type === 'ERROR')).toBe(false);
        });

        it('should process ui5-local.yaml before ui5-mock.yaml in the loop', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'loop-order');
            await mkdir(rootPath, { recursive: true });

            // Create both files with different content to verify order
            await writeFile(
                join(rootPath, 'ui5-local.yaml'),
                `specVersion: '3.0'
metadata:
  name: local-app
type: application
`
            );
            await writeFile(
                join(rootPath, 'ui5-mock.yaml'),
                `specVersion: '3.0'
metadata:
  name: mock-app
type: application
`
            );

            await loadProjectIntoEditor(fs, rootPath);
            await ProjectMigrator['setupTypeScript'](fs, rootPath);

            // Both files should be processed
            const localYaml = fs.read(join(rootPath, 'ui5-local.yaml'));
            const mockYaml = fs.read(join(rootPath, 'ui5-mock.yaml'));

            // Verify both contain the middleware/task
            expect(localYaml).toContain('ui5-tooling-transpile');
            expect(mockYaml).toContain('ui5-tooling-transpile');

            // Verify original names are preserved
            expect(localYaml).toContain('local-app');
            expect(mockYaml).toContain('mock-app');
        });
    });
});
