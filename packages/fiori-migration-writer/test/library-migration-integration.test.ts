/**
 * Integration test for library project migration
 *
 * Tests the complete flow: workspace scanning → getReuseLibs → copyLibraryFiles → actual file placement
 * Addresses review feedback: https://github.wdf.sap.corp/ux-engineering/tools-suite/pull/39527
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ProjectMigrator, MigrationTypes, initI18n } from '@sap-ux/fiori-migration-writer';
import { getReuseLibs, ReuseLibType } from '@sap-ux/fiori-migration-writer';
import type { ProjectFolder } from '@sap-ux/fiori-migration-writer';

const __dirname = dirname(fileURLToPath(import.meta.url));

// UI5 snapshot URL: use env var to support CI outside SAP network
// In CI without network access, mock the HTTP call instead (see projectMigrator.test.ts pattern)
const ui5SnapshotUrl =
    process.env.UI5_SNAPSHOT_URL || 'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com';

describe('Library Migration Integration Tests', () => {
    const testOutputDir = join(__dirname, 'test-output', 'library-integration');

    beforeAll(async () => {
        await initI18n();
        // Clean and create test directory
        await rm(testOutputDir, { recursive: true, force: true });
        await mkdir(testOutputDir, { recursive: true });
    });

    afterAll(async () => {
        // Clean up test directory
        await rm(testOutputDir, { recursive: true, force: true });
    });

    test('should create config files at project root for library with nested namespace structure', async () => {
        // Setup: Create realistic library project structure matching customer scenario
        // This mimics nw.core.om.lib.printreuse structure from support ticket DINC1062937
        const projectRoot = join(testOutputDir, 'test-library-project');
        const libNamespacePath = join(projectRoot, 'src', 'sap', 'company', 'lib', 'testlib');
        await mkdir(libNamespacePath, { recursive: true });

        // Create neo-app.json at project root (required for WebIDE library projects)
        await writeFile(
            join(projectRoot, 'neo-app.json'),
            JSON.stringify(
                {
                    welcomeFile: 'index.html',
                    routes: [
                        {
                            path: '/resources/sap/company/lib/testlib',
                            target: {
                                type: 'application',
                                name: 'sapcompanylibtestlib'
                            }
                        },
                        {
                            path: '/resources',
                            target: {
                                type: 'service',
                                name: 'sapui5',
                                entryPath: '/resources'
                            },
                            description: 'SAPUI5 Resources'
                        }
                    ]
                },
                null,
                2
            )
        );

        // Create library manifest.json in nested location (following namespace structure)
        // This is the correct location for UI5 library manifest files
        await writeFile(
            join(libNamespacePath, 'manifest.json'),
            JSON.stringify(
                {
                    _version: '1.0.0',
                    'sap.app': {
                        id: 'sap.company.lib.testlib',
                        type: 'library',
                        title: 'Test Library',
                        applicationVersion: {
                            version: '1.0.0'
                        }
                    },
                    'sap.ui': {
                        technology: 'UI5'
                    },
                    'sap.ui5': {
                        dependencies: {
                            minUI5Version: '1.96.0'
                        }
                    }
                },
                null,
                4
            )
        );

        // Create library.js
        await writeFile(
            join(libNamespacePath, 'library.js'),
            `sap.ui.define([], function() {
    "use strict";
    sap.ui.getCore().initLibrary({
        name: "sap.company.lib.testlib",
        version: "1.0.0",
        dependencies: [],
        types: [],
        interfaces: [],
        controls: [],
        elements: []
    });
    return sap.company.lib.testlib;
});`
        );

        // Create .library file
        await writeFile(
            join(libNamespacePath, '.library'),
            `<?xml version="1.0" encoding="UTF-8" ?>
<library xmlns="http://www.sap.com/sap.ui.library.xsd" >
  <name>sap.company.lib.testlib</name>
  <vendor>SAP SE</vendor>
  <version>1.0.0</version>
  <documentation>Test Library</documentation>
</library>`
        );

        // Act: Run migration directly (this is what the user does via BAS/VS Code UI)
        // Pass type: library to help migration detect the project type correctly
        const result = await ProjectMigrator.migrate(
            projectRoot,
            libNamespacePath, // Pass libPath as baseUri
            ui5SnapshotUrl,
            {
                moduleName: 'sap.company.lib.testlib',
                type: MigrationTypes.library,
                rootPath: projectRoot,
                webappPath: libNamespacePath,
                // Full ImportProjectInfo shape to match production flow:
                moduleDescription: 'Test Library',
                appTitle: 'Test Library',
                appVersion: '1.0.0',
                ui5Version: '1.96.0',
                hostname: '',
                sapClient: '',
                destination: '',
                flpDatasource: {},
                uiAdaptation: { reference: '', layer: '' }
            },
            undefined,
            false
        );

        // Assert: Verify migration succeeded
        if (!result.result) {
            console.log('Migration failed with messages:', JSON.stringify(result.messages, null, 2));
        }
        expect(result.result).toBe(true);
        expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

        // Assert: Verify config files are at PROJECT ROOT, not nested in src/sap/company/lib/testlib/
        // This is the key assertion - the bug put files in libNamespacePath instead of projectRoot
        expect(existsSync(join(projectRoot, 'package.json'))).toBe(true);
        expect(existsSync(join(projectRoot, 'ui5.yaml'))).toBe(true);
        expect(existsSync(join(projectRoot, '.gitignore'))).toBe(true);

        // Assert: Verify files are NOT in the nested namespace directory (the bug scenario)
        expect(existsSync(join(libNamespacePath, 'package.json'))).toBe(false);
        expect(existsSync(join(libNamespacePath, 'ui5.yaml'))).toBe(false);

        // Assert: Verify source files are still in their original location
        expect(existsSync(join(libNamespacePath, 'manifest.json'))).toBe(true);
        expect(existsSync(join(libNamespacePath, 'library.js'))).toBe(true);
        expect(existsSync(join(libNamespacePath, '.library'))).toBe(true);
    }, 30000);

    test('should handle monorepo with nested package.json using getReuseLibs discovery', async () => {
        // Setup: Test that getReuseLibs() correctly identifies innermost package.json as project root
        // This validates the fix in findLibraryProjectRoot()
        const monorepoRoot = join(testOutputDir, 'monorepo');
        const packageRoot = join(monorepoRoot, 'packages', 'my-lib');
        const libPath = join(packageRoot, 'src', 'lib');
        await mkdir(libPath, { recursive: true });

        // Root package.json (monorepo root)
        await writeFile(
            join(monorepoRoot, 'package.json'),
            JSON.stringify({ name: 'monorepo-root', private: true, workspaces: ['packages/*'] })
        );

        // Package-level package.json (should be found as project root)
        await writeFile(
            join(packageRoot, 'package.json'),
            JSON.stringify({ name: '@company/my-lib', version: '1.0.0' })
        );

        // neo-app.json at package root
        await writeFile(
            join(packageRoot, 'neo-app.json'),
            JSON.stringify({
                welcomeFile: 'index.html',
                routes: [
                    {
                        path: '/resources/company/lib',
                        target: { type: 'application', name: 'companylib' }
                    }
                ]
            })
        );

        // Library manifest
        await writeFile(
            join(libPath, 'manifest.json'),
            JSON.stringify({
                'sap.app': {
                    id: 'company.lib',
                    type: 'library',
                    applicationVersion: { version: '1.0.0' }
                }
            })
        );

        // Library files
        await writeFile(join(libPath, 'library.js'), 'sap.ui.define([], function() {});');
        await writeFile(join(libPath, '.library'), '<?xml version="1.0" ?><library></library>');

        // Act: Use getReuseLibs() directly to test the discovery logic
        const workspaceFolders: readonly ProjectFolder[] = [
            {
                uri: { fsPath: monorepoRoot, scheme: 'file' },
                name: 'monorepo',
                index: 0
            }
        ];

        const libs = await getReuseLibs(workspaceFolders);
        expect(libs).toHaveLength(1);

        // Assert: Should find innermost package.json (packageRoot), not monorepo root
        expect(libs[0].value.libRoot).toBe(packageRoot);
        expect(libs[0].value.libRoot).not.toBe(monorepoRoot);
        expect(libs[0].value.type).toBe(ReuseLibType.LIBRARY);

        // Run migration using the discovered libRoot
        const result = await ProjectMigrator.migrate(
            libs[0].value.libRoot,
            libPath,
            ui5SnapshotUrl,
            {
                moduleName: 'company.lib',
                type: MigrationTypes.library,
                rootPath: libs[0].value.libRoot,
                webappPath: libPath,
                // Full ImportProjectInfo shape
                moduleDescription: 'Company Library',
                appTitle: 'Company Library',
                appVersion: '1.0.0',
                ui5Version: '1.96.0',
                hostname: '',
                sapClient: '',
                destination: '',
                flpDatasource: {},
                uiAdaptation: { reference: '', layer: '' }
            },
            undefined,
            false
        );

        if (!result.result) {
            console.log('Monorepo migration failed:', JSON.stringify(result.messages, null, 2));
        }
        expect(result.result).toBe(true);

        // Assert: Config files at package root (innermost), not monorepo root
        expect(existsSync(join(packageRoot, 'ui5.yaml'))).toBe(true);
        expect(existsSync(join(monorepoRoot, 'ui5.yaml'))).toBe(false);
    }, 30000);
});
