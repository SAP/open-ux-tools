import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import type { ProjectFolder } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import modules under test
const { findAllProjectRoots, getReuseLibs, findAll, ReuseLibType } = await import('../src/utils/file-discovery.js');

describe('file-discovery', () => {
    const testOutputDir = join(__dirname, 'test-output', 'file-discovery');

    beforeEach(async () => {
        // Create test directory
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test directory
        await rm(testOutputDir, { recursive: true, force: true });
    });

    describe('findAllProjectRoots', () => {
        test('should find all package.json files', async () => {
            // Create test structure
            const proj1 = join(testOutputDir, 'project1');
            const proj2 = join(testOutputDir, 'project2');
            await mkdir(proj1, { recursive: true });
            await mkdir(proj2, { recursive: true });
            await writeFile(join(proj1, 'package.json'), JSON.stringify({ name: 'proj1' }));
            await writeFile(join(proj2, 'package.json'), JSON.stringify({ name: 'proj2' }));

            const roots = await findAllProjectRoots([testOutputDir]);
            expect(roots).toHaveLength(2);
            expect(roots).toContain(proj1);
            expect(roots).toContain(proj2);
        });

        test('should filter by sapux when sapuxRequired is true', async () => {
            const proj1 = join(testOutputDir, 'sapux-project');
            const proj2 = join(testOutputDir, 'regular-project');
            await mkdir(proj1, { recursive: true });
            await mkdir(proj2, { recursive: true });

            await writeFile(
                join(proj1, 'package.json'),
                JSON.stringify({
                    name: 'sapux-proj',
                    sapux: true
                })
            );
            await writeFile(join(proj2, 'package.json'), JSON.stringify({ name: 'regular' }));

            const roots = await findAllProjectRoots([testOutputDir], true);
            expect(roots).toHaveLength(1);
            expect(roots[0]).toBe(proj1);
        });

        test('should include projects with @sap-ux/ dependencies when sapuxRequired is true', async () => {
            const proj = join(testOutputDir, 'dep-project');
            await mkdir(proj, { recursive: true });
            await writeFile(
                join(proj, 'package.json'),
                JSON.stringify({
                    name: 'dep-proj',
                    dependencies: {
                        '@sap-ux/ui5-config': '1.0.0'
                    }
                })
            );

            const roots = await findAllProjectRoots([testOutputDir], true);
            expect(roots).toHaveLength(1);
            expect(roots[0]).toBe(proj);
        });

        test('should include projects with @sap/ux- dependencies when sapuxRequired is true', async () => {
            const proj = join(testOutputDir, 'sap-dep-project');
            await mkdir(proj, { recursive: true });
            await writeFile(
                join(proj, 'package.json'),
                JSON.stringify({
                    name: 'sap-dep-proj',
                    dependencies: {
                        '@sap/ux-specification': '1.0.0'
                    }
                })
            );

            const roots = await findAllProjectRoots([testOutputDir], true);
            expect(roots).toHaveLength(1);
            expect(roots[0]).toBe(proj);
        });

        test('should include projects with @sap-ux/ devDependencies when sapuxRequired is true', async () => {
            const proj = join(testOutputDir, 'dev-dep-project');
            await mkdir(proj, { recursive: true });
            await writeFile(
                join(proj, 'package.json'),
                JSON.stringify({
                    name: 'dev-dep-proj',
                    devDependencies: {
                        '@sap-ux/eslint-plugin': '1.0.0'
                    }
                })
            );

            const roots = await findAllProjectRoots([testOutputDir], true);
            expect(roots).toHaveLength(1);
            expect(roots[0]).toBe(proj);
        });

        test('should skip invalid package.json files when sapuxRequired is true', async () => {
            const validProj = join(testOutputDir, 'valid');
            const invalidProj = join(testOutputDir, 'invalid');
            await mkdir(validProj, { recursive: true });
            await mkdir(invalidProj, { recursive: true });

            await writeFile(join(validProj, 'package.json'), JSON.stringify({ name: 'valid', sapux: true }));
            // Write invalid JSON
            await writeFile(join(invalidProj, 'package.json'), '{ invalid json }');

            const roots = await findAllProjectRoots([testOutputDir], true);
            // Should only find the valid project (covers line 65-68: catch block)
            expect(roots).toHaveLength(1);
            expect(roots[0]).toBe(validProj);
        });

        test('should handle non-existent paths gracefully', async () => {
            const nonExistent = join(testOutputDir, 'does-not-exist');
            const roots = await findAllProjectRoots([nonExistent]);
            // Should return empty array (covers line 73-76: catch block)
            expect(roots).toHaveLength(0);
        });

        test('should remove duplicates and sort results', async () => {
            const proj = join(testOutputDir, 'dup-project');
            await mkdir(proj, { recursive: true });
            await writeFile(join(proj, 'package.json'), JSON.stringify({ name: 'proj' }));

            // Pass the same path twice
            const roots = await findAllProjectRoots([testOutputDir, testOutputDir]);
            // Should deduplicate
            expect(roots).toHaveLength(1);
            expect(roots[0]).toBe(proj);
        });
    });

    describe('getReuseLibs', () => {
        test('should find libraries with type: library', async () => {
            const libDir = join(testOutputDir, 'my-lib');
            await mkdir(libDir, { recursive: true });
            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'my.lib',
                        type: 'library'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            expect(libs[0].value.type).toBe(ReuseLibType.LIBRARY);
            expect(libs[0].value.name).toBe('my.lib');
            // libRoot should be workspace folder root (no markers found)
            expect(libs[0].value.libRoot).toBe(testOutputDir);
            expect(libs[0].value.path).toBe(join(libDir, 'manifest.json'));
        });

        test('should find components with type: component', async () => {
            const compDir = join(testOutputDir, 'my-component');
            await mkdir(compDir, { recursive: true });
            await writeFile(
                join(compDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'my.component',
                        type: 'component'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            expect(libs[0].value.type).toBe(ReuseLibType.COMPONENT);
            expect(libs[0].value.name).toBe('my.component');
            // Verify libRoot is set correctly for components too
            expect(libs[0].value.libRoot).toBe(testOutputDir);
        });

        test('should find project root with package.json marker', async () => {
            // Create nested library structure with package.json at root
            const projectRoot = join(testOutputDir, 'my-project');
            const libDir = join(projectRoot, 'src', 'sap', 'company', 'lib', 'mylib');
            await mkdir(libDir, { recursive: true });

            // Add package.json at project root
            await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ name: 'my-project' }));

            // Add manifest in nested directory
            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'sap.company.lib.mylib',
                        type: 'library'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            // libRoot should be project root (where package.json is), not manifest directory
            expect(libs[0].value.libRoot).toBe(projectRoot);
            expect(libs[0].value.path).toBe(join(libDir, 'manifest.json'));
        });

        test('should find project root with .git marker', async () => {
            const projectRoot = join(testOutputDir, 'git-project');
            const libDir = join(projectRoot, 'src', 'lib', 'mylib');
            await mkdir(libDir, { recursive: true });
            await mkdir(join(projectRoot, '.git'), { recursive: true });

            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'my.lib',
                        type: 'library'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            expect(libs[0].value.libRoot).toBe(projectRoot);
        });

        test('should find project root with .project.json marker', async () => {
            const projectRoot = join(testOutputDir, 'webide-project');
            const libDir = join(projectRoot, 'src', 'lib');
            await mkdir(libDir, { recursive: true });
            await writeFile(join(projectRoot, '.project.json'), JSON.stringify({}));

            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'webide.lib',
                        type: 'library'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            expect(libs[0].value.libRoot).toBe(projectRoot);
        });

        test('should find project root with pom.xml marker', async () => {
            const projectRoot = join(testOutputDir, 'maven-project');
            const libDir = join(projectRoot, 'src', 'main', 'resources');
            await mkdir(libDir, { recursive: true });
            await writeFile(join(projectRoot, 'pom.xml'), '<project></project>');

            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'maven.lib',
                        type: 'library'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            expect(libs[0].value.libRoot).toBe(projectRoot);
        });

        test('should use innermost package.json in monorepo scenario', async () => {
            // Monorepo with nested package.json files
            const monorepoRoot = join(testOutputDir, 'monorepo');
            const packageRoot = join(monorepoRoot, 'packages', 'lib-package');
            const libDir = join(packageRoot, 'src', 'lib');
            await mkdir(libDir, { recursive: true });

            // Root package.json (monorepo root)
            await writeFile(join(monorepoRoot, 'package.json'), JSON.stringify({ name: 'monorepo' }));
            // Package-level package.json (innermost - should win)
            await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: 'lib-package' }));

            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'monorepo.lib',
                        type: 'library'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            // Should find innermost package.json (packageRoot), not monorepo root
            expect(libs[0].value.libRoot).toBe(packageRoot);
        });

        test('should skip applications (type: application)', async () => {
            const appDir = join(testOutputDir, 'my-app');
            await mkdir(appDir, { recursive: true });
            await writeFile(
                join(appDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'my.app',
                        type: 'application'
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            // Should not include applications
            expect(libs).toHaveLength(0);
        });

        test('should use basename as name when sap.app.id is missing', async () => {
            const libDir = join(testOutputDir, 'my-nested', 'lib', 'fallback-lib');
            await mkdir(libDir, { recursive: true });
            await writeFile(
                join(libDir, 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        type: 'library'
                        // no id
                    }
                })
            );

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(1);
            // Name should be basename of manifest directory
            expect(libs[0].value.name).toBe('fallback-lib');
            // libRoot should be workspace folder root
            expect(libs[0].value.libRoot).toBe(testOutputDir);
        });

        test('should skip invalid manifest.json files', async () => {
            const validLib = join(testOutputDir, 'valid-lib');
            const invalidLib = join(testOutputDir, 'invalid-lib');
            await mkdir(validLib, { recursive: true });
            await mkdir(invalidLib, { recursive: true });

            await writeFile(
                join(validLib, 'manifest.json'),
                JSON.stringify({ 'sap.app': { id: 'valid', type: 'library' } })
            );
            // Write invalid JSON
            await writeFile(join(invalidLib, 'manifest.json'), '{ invalid json }');

            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: testOutputDir, scheme: 'file' },
                    name: 'test',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            // Should only find valid lib (covers line 140-143: catch block)
            expect(libs).toHaveLength(1);
            expect(libs[0].value.name).toBe('valid');
        });

        test('should handle non-existent workspace folders gracefully', async () => {
            const folders: readonly ProjectFolder[] = [
                {
                    uri: { fsPath: join(testOutputDir, 'does-not-exist'), scheme: 'file' },
                    name: 'ghost',
                    index: 0
                }
            ];

            const libs = await getReuseLibs(folders);
            // Should return empty array (covers line 145-148: catch block)
            expect(libs).toHaveLength(0);
        });

        test('should process multiple workspace folders', async () => {
            const ws1 = join(testOutputDir, 'workspace1');
            const ws2 = join(testOutputDir, 'workspace2');
            await mkdir(join(ws1, 'lib1'), { recursive: true });
            await mkdir(join(ws2, 'lib2'), { recursive: true });

            await writeFile(
                join(ws1, 'lib1', 'manifest.json'),
                JSON.stringify({ 'sap.app': { id: 'ws1.lib1', type: 'library' } })
            );
            await writeFile(
                join(ws2, 'lib2', 'manifest.json'),
                JSON.stringify({ 'sap.app': { id: 'ws2.lib2', type: 'component' } })
            );

            const folders: readonly ProjectFolder[] = [
                { uri: { fsPath: ws1, scheme: 'file' }, name: 'ws1', index: 0 },
                { uri: { fsPath: ws2, scheme: 'file' }, name: 'ws2', index: 1 }
            ];

            const libs = await getReuseLibs(folders);
            expect(libs).toHaveLength(2);
            expect(libs.map((l) => l.value.name).sort()).toEqual(['ws1.lib1', 'ws2.lib2']);
        });
    });

    describe('findAll', () => {
        test('should find files by name', async () => {
            const dir1 = join(testOutputDir, 'dir1');
            const dir2 = join(testOutputDir, 'dir2');
            await mkdir(dir1, { recursive: true });
            await mkdir(dir2, { recursive: true });
            await writeFile(join(dir1, 'target.txt'), 'content');
            await writeFile(join(dir2, 'target.txt'), 'content');

            const results: string[] = [];
            await findAll(testOutputDir, 'target.txt', results, []);

            expect(results).toHaveLength(2);
            expect(results).toContain(dir1);
            expect(results).toContain(dir2);
        });

        test('should respect ignore paths', async () => {
            const included = join(testOutputDir, 'included');
            const ignored = join(testOutputDir, 'ignored');
            await mkdir(included, { recursive: true });
            await mkdir(ignored, { recursive: true });
            await writeFile(join(included, 'file.txt'), 'content');
            await writeFile(join(ignored, 'file.txt'), 'content');

            const results: string[] = [];
            await findAll(testOutputDir, 'file.txt', results, ['**/ignored/**']);

            expect(results).toHaveLength(1);
            expect(results[0]).toBe(included);
        });

        test('should not add duplicate directories', async () => {
            const dir = join(testOutputDir, 'single-dir');
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, 'file1.txt'), 'content');
            await writeFile(join(dir, 'file2.txt'), 'content');

            const results: string[] = [];
            // Find 'file1.txt', then find 'file2.txt' - should not duplicate dir
            await findAll(testOutputDir, 'file1.txt', results, []);
            await findAll(testOutputDir, 'file2.txt', results, []);

            // Dir should only appear once
            expect(results.filter((r) => r === dir)).toHaveLength(1);
        });

        test('should handle non-existent search paths gracefully', async () => {
            const results: string[] = [];
            await findAll(join(testOutputDir, 'does-not-exist'), 'file.txt', results, []);

            // Should not throw, should return empty (covers line 192-194: catch block)
            expect(results).toHaveLength(0);
        });

        test('should ignore node_modules, dist, and .git by default', async () => {
            const nodeModules = join(testOutputDir, 'node_modules', 'pkg');
            const dist = join(testOutputDir, 'dist', 'output');
            const git = join(testOutputDir, '.git', 'objects');
            const valid = join(testOutputDir, 'src');

            await mkdir(nodeModules, { recursive: true });
            await mkdir(dist, { recursive: true });
            await mkdir(git, { recursive: true });
            await mkdir(valid, { recursive: true });

            await writeFile(join(nodeModules, 'file.txt'), 'content');
            await writeFile(join(dist, 'file.txt'), 'content');
            await writeFile(join(git, 'file.txt'), 'content');
            await writeFile(join(valid, 'file.txt'), 'content');

            const results: string[] = [];
            await findAll(testOutputDir, 'file.txt', results, []);

            // Should only find the valid directory
            expect(results).toHaveLength(1);
            expect(results[0]).toBe(valid);
        });
    });
});
