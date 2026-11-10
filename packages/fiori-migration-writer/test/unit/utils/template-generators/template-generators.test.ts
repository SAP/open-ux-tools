import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
    handlePackageJsonFile,
    handleGitIgnoreFile,
    handleLocateReuseLibsFile
} from '../../../../src/utils/template-generators/file-handlers.js';
import { MigrationTypes } from '../../../../src/utils/constants.js';

describe('Template Generators - File Handlers', () => {
    const testRoot = join(tmpdir(), 'fiori-migration-template-test-' + Date.now());

    beforeAll(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterAll(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    describe('handlePackageJsonFile', () => {
        test('should remove legacy dependencies', async () => {
            const targetFile = join(testRoot, 'package.json');

            // Create existing package.json with legacy dependencies
            writeFileSync(
                targetFile,
                JSON.stringify({
                    name: 'test-project',
                    dependencies: {
                        'valid-dep': '2.0.0'
                    },
                    devDependencies: {
                        '@ui5/fs': '1.0.0',
                        '@sap/grunt-sapui5-bestpractice-build': '1.0.0',
                        '@sap-ux/specification': '1.76.1',
                        '@sap/ux-specification': '1.76.1',
                        'valid-dev-dep': '3.0.0'
                    }
                })
            );

            // Template content with minimal structure
            const templateContent = JSON.stringify({
                name: 'test-project',
                scripts: { start: 'fiori run' }
            });

            const result = await handlePackageJsonFile(testRoot, targetFile, templateContent, {
                project: {}
            });
            const parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } =
                JSON.parse(result);

            // Assert legacy modules are removed
            expect(parsed.dependencies?.['valid-dep']).toBe('2.0.0');
            expect(parsed.devDependencies?.['@ui5/fs']).toBeUndefined();
            expect(parsed.devDependencies?.['@sap/grunt-sapui5-bestpractice-build']).toBeUndefined();
            expect(parsed.devDependencies?.['@sap-ux/specification']).toBeUndefined();
            expect(parsed.devDependencies?.['@sap/ux-specification']).toBeUndefined();
            expect(parsed.devDependencies?.['valid-dev-dep']).toBe('3.0.0');
        });

        test('returns template content unchanged when the target does not exist', async () => {
            const targetFile = join(testRoot, 'does-not-exist', 'package.json');
            const templateContent = JSON.stringify({ name: 'new' });
            const result = await handlePackageJsonFile(testRoot, targetFile, templateContent, { project: {} });
            expect(result).toBe(templateContent);
        });

        test('removes conflicting dependencies and devDependencies present in the template', async () => {
            const targetFile = join(testRoot, 'conflict', 'package.json');
            mkdirSync(join(testRoot, 'conflict'), { recursive: true });
            writeFileSync(
                targetFile,
                JSON.stringify({
                    name: 'conflict',
                    dependencies: { shared: '1.0.0', keep: '2.0.0' },
                    devDependencies: { sharedDev: '1.0.0' }
                })
            );
            const templateContent = JSON.stringify({
                dependencies: { shared: '9.9.9' },
                devDependencies: { sharedDev: '9.9.9' }
            });
            const result = await handlePackageJsonFile(testRoot, targetFile, templateContent, { project: {} });
            const parsed = JSON.parse(result);
            // template wins; existing "keep" dep is preserved
            expect(parsed.dependencies.shared).toBe('9.9.9');
            expect(parsed.dependencies.keep).toBe('2.0.0');
            expect(parsed.devDependencies.sharedDev).toBe('9.9.9');
        });

        test('removes the Gruntfile when the grunt dependency is present', async () => {
            const projectDir = join(testRoot, 'grunt');
            mkdirSync(projectDir, { recursive: true });
            const targetFile = join(projectDir, 'package.json');
            writeFileSync(join(projectDir, 'Gruntfile.js'), 'module.exports = () => {};');
            writeFileSync(
                targetFile,
                JSON.stringify({
                    name: 'grunt-app',
                    dependencies: { '@sap/grunt-sapui5-bestpractice-build': '1.0.0' },
                    ui5: { dependencies: ['@sap-ux/ui5-tooling'] }
                })
            );
            const result = await handlePackageJsonFile(projectDir, targetFile, JSON.stringify({ name: 'grunt-app' }), {
                project: {}
            });
            const parsed = JSON.parse(result);
            expect(parsed.dependencies?.['@sap/grunt-sapui5-bestpractice-build']).toBeUndefined();
            // ui5.dependencies only had the beta tooling module, so ui5 is removed entirely
            expect(parsed.ui5).toBeUndefined();
        });

        test('renames conflicting scripts and filters duplicate keywords', async () => {
            const dir = join(testRoot, 'scripts-keywords');
            mkdirSync(dir, { recursive: true });
            const targetFile = join(dir, 'package.json');
            writeFileSync(
                targetFile,
                JSON.stringify({
                    name: 'sk-app',
                    scripts: { build: 'grunt build', deploy: 'old deploy' },
                    keywords: ['fiori', 'legacy']
                })
            );
            const templateContent = JSON.stringify({
                scripts: { build: 'ui5 build' },
                keywords: ['fiori', 'new']
            });
            const result = await handlePackageJsonFile(dir, targetFile, templateContent, { project: {} });
            const parsed = JSON.parse(result);
            // The conflicting "build" script is preserved under "build_old"
            expect(parsed.scripts.build).toBe('ui5 build');
            expect(parsed.scripts.build_old).toBe('grunt build');
            // The duplicate "fiori" keyword from the existing file is filtered out, new one added
            expect(parsed.keywords).toContain('new');
        });

        test('adds the extension project start-ui5-flp script', async () => {
            const projectDir = join(testRoot, 'extension');
            mkdirSync(projectDir, { recursive: true });
            const targetFile = join(projectDir, 'package.json');
            writeFileSync(targetFile, JSON.stringify({ name: 'ext-app' }));
            const templateContent = JSON.stringify({ name: 'ext-app' });
            const result = await handlePackageJsonFile(projectDir, targetFile, templateContent, {
                project: { type: MigrationTypes.projectExtension, ui5Theme: 'sap_horizon' },
                service: { client: '100' },
                fullyQualifiedProjectName: 'my.ext.app'
            });
            const parsed = JSON.parse(result);
            expect(parsed.scripts['start-ui5-flp']).toContain('sap-theme=sap_horizon');
            expect(parsed.scripts['start-ui5-flp']).toContain('sap-client=100');
        });
    });

    describe('handleGitIgnoreFile', () => {
        test('returns template content when no .gitignore exists', async () => {
            const targetFile = join(testRoot, 'no-gitignore', '.gitignore');
            const result = await handleGitIgnoreFile(targetFile, 'node_modules\n');
            expect(result).toBe('node_modules\n');
        });

        test('appends to an existing .gitignore and strips changes_preview.js references', async () => {
            const dir = join(testRoot, 'with-gitignore');
            mkdirSync(dir, { recursive: true });
            const targetFile = join(dir, '.gitignore');
            writeFileSync(targetFile, 'dist\n/changes_preview.js\n');
            const result = await handleGitIgnoreFile(targetFile, 'coverage\n');
            expect(result).toContain('dist');
            expect(result).toContain('coverage');
            expect(result).not.toContain('changes_preview.js');
        });
    });

    describe('handleLocateReuseLibsFile', () => {
        test('replaces the mockserver path with the configured mock server file name', () => {
            const result = handleLocateReuseLibsFile('load("/mockserver")', { mockServerJSFileName: 'mockserver.js' });
            expect(result).toBe('load("/mockserver.js")');
        });
    });
});
