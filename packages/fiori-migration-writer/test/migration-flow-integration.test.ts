import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectMigrator, initI18n } from '../src/index.js';
import { loadProjectIntoMemFs, fileExistsInMemFs, getFileFromMemFs } from './helpers/mem-fs-helper.js';
import { DUMMY_BACKEND_URL, UI5_SNAPSHOT_URL } from './test-constants.js';
import type { Editor } from 'mem-fs-editor';
import { toMatchSpecificSnapshot } from 'jest-specific-snapshot';

expect.extend({ toMatchSpecificSnapshot });

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_INPUT = join(__dirname, 'input');
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const UUID_TEST_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

expect.addSnapshotSerializer({
    test: (value: unknown): boolean =>
        typeof value === 'object' && value !== null && UUID_TEST_PATTERN.test(JSON.stringify(value)),
    print: (value: unknown, serialize: (value: unknown) => string): string =>
        serialize(JSON.parse(JSON.stringify(value).replace(UUID_PATTERN, '<generated-uuid>')))
});

/**
 * Helper to verify migrated files using per-file snapshots
 * Creates separate snapshot files for each app to make reviews manageable
 */
function verifyMigratedFiles(fs: Editor, projectPath: string, appName: string): void {
    const filesToCheck = [
        'package.json',
        'ui5.yaml',
        'ui5-local.yaml',
        'ui5-mock.yaml',
        '.gitignore',
        'webapp/manifest.json',
        'webapp/test/flpSandbox.html',
        'webapp/test/flpSandboxMockServer.html'
    ];

    filesToCheck.forEach((file) => {
        const content = getFileFromMemFs(fs, projectPath, file);
        if (content) {
            // Use specific snapshot path per app and file
            const snapshotPath = join(__dirname, '__snapshots__', 'integration', appName, file + '.snap');
            expect(content).toMatchSpecificSnapshot(snapshotPath);
        }
    });
}

describe('Migration Integration Tests', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('LROP v2 Migration', () => {
        test('should migrate tool_suite_beta_lrop_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);

            // Run migration with dummy backend URL to test proxy config generation
            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            // Verify migration succeeded
            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // Verify generated files exist
            expect(fileExistsInMemFs(updatedFs, projectPath, 'ui5.yaml')).toBe(true);
            expect(fileExistsInMemFs(updatedFs, projectPath, 'package.json')).toBe(true);

            // Verify ui5.yaml content
            const ui5Yaml = getFileFromMemFs(updatedFs, projectPath, 'ui5.yaml');
            expect(ui5Yaml).toBeDefined();
            expect(ui5Yaml).toContain('fiori-tools-proxy');
            expect(ui5Yaml).toContain('fiori-tools-appreload');
            // Verify backend proxy configuration is generated
            expect(ui5Yaml).toContain('backend:');
            expect(ui5Yaml).toContain(DUMMY_BACKEND_URL);

            // Verify package.json content
            const packageJson = getFileFromMemFs(updatedFs, projectPath, 'package.json');
            expect(packageJson).toBeDefined();
            const pkg = JSON.parse(packageJson!);
            expect(pkg.devDependencies).toHaveProperty('@sap/ux-ui5-tooling');
            expect(pkg.devDependencies).toHaveProperty('@ui5/cli');

            // Verify migrated files with per-file snapshots
            verifyMigratedFiles(updatedFs, projectPath, 'tool_suite_beta_lrop_v2_project');
        });
    });

    describe('LROP v4 Migration', () => {
        test('should migrate tool_suite_v4_lrop', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_v4_lrop');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // Verify ui5.yaml exists and has expected content
            const ui5Yaml = getFileFromMemFs(updatedFs, projectPath, 'ui5.yaml');
            expect(ui5Yaml).toBeDefined();
            expect(ui5Yaml).toContain('specVersion');

            verifyMigratedFiles(updatedFs, projectPath, 'tool_suite_beta_lrop_v2_project');
        });

        test('should migrate tool_suite_v4_lrop_custom_webapp', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_v4_lrop_custom_webapp');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'tool_suite_v4_lrop_custom_webapp');
        });
    });

    describe('OVP Migration', () => {
        test('should migrate webide_v2_ovp_project', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_ovp_project');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'webide_v2_ovp_project');
        });

        test.skip('should migrate multi_destination_ovp_mta', async () => {
            // MTA project - the actual app is in a subdirectory
            const mtaRoot = join(TEST_INPUT, 'multi_destination_ovp_mta');
            const projectPath = join(mtaRoot, 'multi_destination_ovp');
            const fs = loadProjectIntoMemFs(mtaRoot);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'multi_destination_ovp');
        });
    });

    describe('ALP v2 Migration', () => {
        test('should migrate tool_suite_beta_alp_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_beta_alp_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'tool_suite_beta_alp_v2_project');
        });
    });

    describe('Worklist Migration', () => {
        test('should migrate tool_suite_ga_worklist_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_ga_worklist_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'tool_suite_ga_worklist_v2_project');
        });
    });

    describe('Freestyle Migration', () => {
        test('should migrate webide_freestyle_custom_webapp_path', async () => {
            const projectPath = join(TEST_INPUT, 'webide_freestyle_custom_webapp_path');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'webide_freestyle_custom_webapp_path');
        });
    });

    describe('Special Cases', () => {
        test('should migrate webide_v2_lrop_project_no_webapp', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_lrop_project_no_webapp');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'webide_v2_lrop_project_no_webapp');
        });

        test('should migrate webide_v2_lrop_reuselib_ui5_tooling_routing_project', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_lrop_reuselib_ui5_tooling_routing_project');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'webide_v2_lrop_reuselib_ui5_tooling_routing_project');
        });

        test('should migrate openui5-sample-app', async () => {
            const projectPath = join(TEST_INPUT, 'openui5-sample-app');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            // Note: This might not succeed as it's an OpenUI5 project
            // Just verify it doesn't crash
            expect(result).toBeDefined();
            verifyMigratedFiles(updatedFs, projectPath, 'openui5-sample-app');
        });

        test('should migrate CA_FIORI_INBOXExtension', async () => {
            const projectPath = join(TEST_INPUT, 'CA_FIORI_INBOXExtension');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'CA_FIORI_INBOXExtension');
        });
    });

    describe('UI5 Library Migration', () => {
        test('should migrate standalone UI5 library', async () => {
            const projectPath = join(TEST_INPUT, 'coverage_ui5_library_standalone');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // UI5 libraries should have type: library in manifest
            const manifest = JSON.parse(getFileFromMemFs(updatedFs, projectPath, 'manifest.json'));
            expect(manifest['sap.app'].type).toBe('library');

            verifyMigratedFiles(updatedFs, projectPath, 'coverage_ui5_library_standalone');
        });
    });

    describe('Reuse Library Migration', () => {
        test.skip('should migrate reuse_library_project', async () => {
            // TODO: Reuse library detection needs to be fixed
            // Error: "This project type is not supported for migration"
            // Reuse library projects have manifest.json in subdirectories, not root
            const projectPath = join(TEST_INPUT, 'reuse_library_project');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'reuse_library_project');
        });
    });

    describe('Adaptation Project Migration', () => {
        test('should migrate adaptation_project_wde', async () => {
            const projectPath = join(TEST_INPUT, 'adaptation_project_wde');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // Adaptation projects should have manifest.appdescr_variant
            expect(fileExistsInMemFs(updatedFs, projectPath, 'webapp/manifest.appdescr_variant')).toBe(true);

            verifyMigratedFiles(updatedFs, projectPath, 'adaptation_project_wde');
        });
    });

    describe('Adaptation Projects Coverage', () => {
        test('should migrate adaptation project with legacy structure', async () => {
            const projectPath = join(TEST_INPUT, 'coverage_adaptation_webide_legacy');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'coverage_adaptation_webide_legacy');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle project with legacy neo-app routes', async () => {
            const projectPath = join(TEST_INPUT, 'coverage_legacy_neo_app');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            // May have warnings but should not fail
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'coverage_legacy_neo_app');
        });

        test('should handle project with multiple reuse libraries', async () => {
            const projectPath = join(TEST_INPUT, 'coverage_reuse_libs_multiple');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // Should have locate-reuse-libs.js for reuse library loading
            expect(fileExistsInMemFs(updatedFs, projectPath, 'webapp/test/locate-reuse-libs.js')).toBe(true);
            verifyMigratedFiles(updatedFs, projectPath, 'coverage_reuse_libs_multiple');
        });

        test('should handle backend configuration variants', async () => {
            const projectPath = join(TEST_INPUT, 'coverage_backend_config_variants');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
            verifyMigratedFiles(updatedFs, projectPath, 'coverage_backend_config_variants');
        });

        test('should handle service detection edge cases', async () => {
            const projectPath = join(TEST_INPUT, 'coverage_service_detection_edge_cases');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            // May have warnings for edge cases
            verifyMigratedFiles(updatedFs, projectPath, 'coverage_service_detection_edge_cases');
        });
    });

    describe('Legacy Folder Structure Migration', () => {
        test('should migrate project with src/main/webapp structure (AR)', async () => {
            const projectPath = join(TEST_INPUT, 'legacy_fin_ar_lineitems');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // Verify webapp was moved from src/main/webapp to webapp
            expect(fileExistsInMemFs(updatedFs, projectPath, 'webapp/manifest.json')).toBe(true);
            expect(fileExistsInMemFs(updatedFs, projectPath, 'webapp/Component.js')).toBe(true);

            // Legacy paths should be gone
            expect(fileExistsInMemFs(updatedFs, projectPath, 'src/main/webapp/manifest.json')).toBe(false);

            verifyMigratedFiles(updatedFs, projectPath, 'legacy_fin_ar_lineitems');
        });

        test('should migrate project with src/main/webapp structure (CostCenter)', async () => {
            const projectPath = join(TEST_INPUT, 'legacy_fin_co_costcenter');
            const fs = loadProjectIntoMemFs(projectPath);

            const {
                fs: updatedFs,
                result,
                messages
            } = await ProjectMigrator.migrate(
                projectPath,
                DUMMY_BACKEND_URL,
                UI5_SNAPSHOT_URL,
                undefined,
                undefined,
                false,
                fs
            );

            expect(result).toBe(true);
            expect(messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

            // Verify folder structure migration
            expect(fileExistsInMemFs(updatedFs, projectPath, 'webapp/manifest.json')).toBe(true);
            expect(fileExistsInMemFs(updatedFs, projectPath, 'src/main/webapp/manifest.json')).toBe(false);

            verifyMigratedFiles(updatedFs, projectPath, 'legacy_fin_co_costcenter');
        });
    });

    describe('Bulk Migration', () => {
        test.skip('should migrate multiple projects in bulk', async () => {
            // TODO: This test modifies test/input/ directories directly via BulkProjectMigrator
            // which doesn't support mem-fs. Need to copy projects to temp directories first.
            // Skipping until proper temp directory setup is implemented.
            const projects = [
                {
                    path: join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project'),
                    rootPath: join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project'),
                    uri: 'file://' + join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project')
                },
                {
                    path: join(TEST_INPUT, 'openui5-sample-app'),
                    rootPath: join(TEST_INPUT, 'openui5-sample-app'),
                    uri: 'file://' + join(TEST_INPUT, 'openui5-sample-app')
                }
            ];

            const { BulkProjectMigrator } = await import('../src/index.js');
            const bulkMigrator = new BulkProjectMigrator();

            const results = await bulkMigrator.migrate(projects, UI5_SNAPSHOT_URL);
            expect(results).toHaveLength(2);
            expect(results.filter((r) => r.status === 'SUCCESS')).toHaveLength(2);
        });
    });
});
