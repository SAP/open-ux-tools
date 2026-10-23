import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { createMemFsEditor, runWithEditor } from '../../src/utils/fs-adapter.js';
import { writeFile as writeFileUtil, initI18n } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Access private static methods for testing via reflection

const getProjectMigratorPrivate = async (): Promise<any> => {
    const module = await import('../../src/ProjectMigrator.js');
    return module.ProjectMigrator;
};

describe('ProjectMigrator', () => {
    let fs: Editor;
    const testOutputDir = join(__dirname, 'test-output', 'project-migrator');

    beforeEach(async () => {
        await initI18n();
        fs = createMemFsEditor();
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    describe('detectTypeScriptApp', () => {
        it('should return false for JavaScript-only project', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'js-project');
            await mkdir(join(rootPath, 'webapp'), { recursive: true });
            await writeFile(join(rootPath, 'webapp', 'Component.js'), 'sap.ui.define([], function() {});');

            // Access private method via reflection
            const result = await ProjectMigrator['detectTypeScriptApp'](rootPath, 'webapp');
            expect(result).toBe(false);
        });

        it('should return true for TypeScript project with .ts files', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'ts-project');
            await mkdir(join(rootPath, 'webapp'), { recursive: true });
            await writeFile(join(rootPath, 'webapp', 'Component.ts'), 'export class Component {}');

            const result = await ProjectMigrator['detectTypeScriptApp'](rootPath, 'webapp');
            expect(result).toBe(true);
        });

        it('should ignore .d.ts files when detecting TypeScript', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'dts-only');
            await mkdir(join(rootPath, 'webapp'), { recursive: true });
            await writeFile(join(rootPath, 'webapp', 'types.d.ts'), 'declare module "test" {}');

            const result = await ProjectMigrator['detectTypeScriptApp'](rootPath, 'webapp');
            expect(result).toBe(false);
        });

        it('should return false for non-existent webapp folder', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'no-webapp');
            await mkdir(rootPath, { recursive: true });

            const result = await ProjectMigrator['detectTypeScriptApp'](rootPath, 'webapp');
            expect(result).toBe(false);
        });
    });

    describe('webappHasTypeScriptFile', () => {
        it('should detect .ts files in nested directories', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const webappPath = join(testOutputDir, 'nested-ts', 'webapp');
            await mkdir(join(webappPath, 'controller'), { recursive: true });
            await writeFile(join(webappPath, 'controller', 'Main.controller.ts'), 'export class Main {}');

            const result = await ProjectMigrator['webappHasTypeScriptFile'](webappPath);
            expect(result).toBe(true);
        });

        it('should return false for empty webapp folder', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const webappPath = join(testOutputDir, 'empty-webapp', 'webapp');
            await mkdir(webappPath, { recursive: true });

            const result = await ProjectMigrator['webappHasTypeScriptFile'](webappPath);
            expect(result).toBe(false);
        });

        it('should detect TypeScript files in mem-fs context', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const webappPath = join(testOutputDir, 'memfs-ts', 'webapp');

            await runWithEditor(fs, async () => {
                // Write a .ts file to mem-fs
                writeFileUtil(join(webappPath, 'Component.ts'), 'export class Component {}');

                const result = await ProjectMigrator['webappHasTypeScriptFile'](webappPath);
                expect(result).toBe(true);
            });
        });

        it('should ignore deleted files in mem-fs', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            const rootPath = join(testOutputDir, 'memfs-deleted');
            const webappPath = join(rootPath, 'webapp');

            // First create a real file
            await mkdir(webappPath, { recursive: true });
            await writeFile(join(webappPath, 'Component.ts'), 'export class Component {}');

            await runWithEditor(fs, async () => {
                // Delete the file in mem-fs
                fs.delete(join(webappPath, 'Component.ts'));

                const result = await ProjectMigrator['webappHasTypeScriptFile'](webappPath);
                // File is deleted in mem-fs, should return false
                expect(result).toBe(false);
            });
        });
    });

    describe('setupTypeScript', () => {
        it('should handle enableTypescript error gracefully', async () => {
            const ProjectMigrator = await getProjectMigratorPrivate();
            // Use a path that will cause enableTypescript to fail (no package.json)
            const rootPath = join(testOutputDir, 'ts-setup-error');
            await mkdir(rootPath, { recursive: true });

            await runWithEditor(fs, async () => {
                const messages = await ProjectMigrator['setupTypeScript'](rootPath);
                // Should return error message
                expect(messages.some((m: { type: string }) => m.type === 'ERROR')).toBe(true);
            });
        });
    });

    describe('migrate - path resolution', () => {
        it('should resolve relative paths to absolute paths', async () => {
            const { ProjectMigrator } = await import('../../src/ProjectMigrator.js');
            const { resolve } = await import('node:path');

            // Create a minimal project structure
            const projectName = 'relative-path-test';
            const absoluteProjectRoot = join(testOutputDir, projectName);
            await mkdir(join(absoluteProjectRoot, 'webapp'), { recursive: true });

            // Create minimal manifest.json
            await writeFile(
                join(absoluteProjectRoot, 'webapp', 'manifest.json'),
                JSON.stringify({
                    'sap.app': { id: 'test.app', type: 'application' },
                    'sap.ui5': { dependencies: { minUI5Version: '1.84.0' } }
                })
            );

            // Create package.json with sapux flag
            await writeFile(
                join(absoluteProjectRoot, 'package.json'),
                JSON.stringify({ name: 'test-app', sapux: true })
            );

            // Change to test output directory so relative path works
            const originalCwd = process.cwd();
            process.chdir(testOutputDir);

            try {
                // Call migrate with relative path
                const { result, messages } = await ProjectMigrator.migrate({
                    projectRoot: `./${projectName}`, // Relative path
                    baseUri: 'https://backend.example.com',
                    fs
                });

                // If path resolution works, validation should complete without hanging
                // We expect this to fail with missing data, but it shouldn't hang
                expect(result).toBeDefined();
                expect(messages).toBeDefined();
            } finally {
                // Restore original working directory
                process.chdir(originalCwd);
            }
        });

        it('should handle absolute paths correctly', async () => {
            const { ProjectMigrator } = await import('../../src/ProjectMigrator.js');

            // Create a minimal project structure
            const projectName = 'absolute-path-test';
            const absoluteProjectRoot = join(testOutputDir, projectName);
            await mkdir(join(absoluteProjectRoot, 'webapp'), { recursive: true });

            // Create minimal manifest.json
            await writeFile(
                join(absoluteProjectRoot, 'webapp', 'manifest.json'),
                JSON.stringify({
                    'sap.app': { id: 'test.app2', type: 'application' },
                    'sap.ui5': { dependencies: { minUI5Version: '1.84.0' } }
                })
            );

            // Create package.json with sapux flag
            await writeFile(
                join(absoluteProjectRoot, 'package.json'),
                JSON.stringify({ name: 'test-app2', sapux: true })
            );

            // Call migrate with absolute path
            const { result, messages } = await ProjectMigrator.migrate({
                projectRoot: absoluteProjectRoot, // Absolute path
                baseUri: 'https://backend.example.com',
                fs
            });

            // Should work without issues
            expect(result).toBeDefined();
            expect(messages).toBeDefined();
        });

        it('should handle migration errors with proper fallback message', async () => {
            const { ProjectMigrator } = await import('../../src/ProjectMigrator.js');

            // Create invalid project structure (no manifest.json)
            const projectName = 'error-test';
            const absoluteProjectRoot = join(testOutputDir, projectName);
            await mkdir(absoluteProjectRoot, { recursive: true });

            // Call migrate with invalid project
            const { result, messages } = await ProjectMigrator.migrate({
                projectRoot: absoluteProjectRoot,
                baseUri: 'https://backend.example.com',
                fs
            });

            // Should fail but have error messages
            expect(result).toBe(false);
            expect(messages.length).toBeGreaterThan(0);

            // All error messages should be non-empty (testing the fallback chain)
            messages.forEach((msg) => {
                expect(msg.type).toBe('ERROR');
                expect(msg.description).toBeTruthy();
                expect(msg.description.length).toBeGreaterThan(0);
            });
        }, 10000); // 10s timeout for migration
    });
});
