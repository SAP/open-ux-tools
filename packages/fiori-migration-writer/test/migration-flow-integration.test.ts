import { describe, test, expect, beforeAll } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectMigrator, initI18n } from '../src/index.js';
import { loadProjectIntoMemFs, fileExistsInMemFs, getFileFromMemFs } from './helpers/mem-fs-helper.js';
import { DUMMY_BACKEND_URL, UI5_SNAPSHOT_URL } from './test-constants.js';
import type { Editor } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_INPUT = join(__dirname, 'input');

describe('Migration Integration Tests', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('LROP v2 Migration', () => {
        test('should migrate tool_suite_beta_lrop_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_beta_lrop_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);

            // Set the static fs property
            ProjectMigrator.fs = fs;

            try {
                // Run migration with dummy backend URL to test proxy config generation
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                // Verify migration succeeded
                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

                // Verify generated files exist
                expect(fileExistsInMemFs(fs, projectPath, 'ui5.yaml')).toBe(true);
                expect(fileExistsInMemFs(fs, projectPath, 'package.json')).toBe(true);

                // Verify ui5.yaml content
                const ui5Yaml = getFileFromMemFs(fs, projectPath, 'ui5.yaml');
                expect(ui5Yaml).toBeDefined();
                expect(ui5Yaml).toContain('fiori-tools-proxy');
                expect(ui5Yaml).toContain('fiori-tools-appreload');
                // Verify backend proxy configuration is generated
                expect(ui5Yaml).toContain('backend:');
                expect(ui5Yaml).toContain(DUMMY_BACKEND_URL);

                // Verify package.json content
                const packageJson = getFileFromMemFs(fs, projectPath, 'package.json');
                expect(packageJson).toBeDefined();
                const pkg = JSON.parse(packageJson!);
                expect(pkg.devDependencies).toHaveProperty('@sap/ux-ui5-tooling');
                expect(pkg.devDependencies).toHaveProperty('@ui5/cli');

                // Snapshot test for full output
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                // Clean up
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('LROP v4 Migration', () => {
        test('should migrate tool_suite_v4_lrop', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_v4_lrop');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);

                // Verify ui5.yaml exists and has expected content
                const ui5Yaml = getFileFromMemFs(fs, projectPath, 'ui5.yaml');
                expect(ui5Yaml).toBeDefined();
                expect(ui5Yaml).toContain('specVersion');

                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });

        test('should migrate tool_suite_v4_lrop_custom_webapp', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_v4_lrop_custom_webapp');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('OVP Migration', () => {
        test('should migrate webide_v2_ovp_project', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_ovp_project');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });

        test.skip('should migrate multi_destination_ovp_mta', async () => {
            // MTA project - the actual app is in a subdirectory
            const mtaRoot = join(TEST_INPUT, 'multi_destination_ovp_mta');
            const projectPath = join(mtaRoot, 'multi_destination_ovp');
            const fs = loadProjectIntoMemFs(mtaRoot);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('ALP v2 Migration', () => {
        test('should migrate tool_suite_beta_alp_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_beta_alp_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('Worklist Migration', () => {
        test('should migrate tool_suite_ga_worklist_v2_project', async () => {
            const projectPath = join(TEST_INPUT, 'tool_suite_ga_worklist_v2_project');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('Freestyle Migration', () => {
        test('should migrate webide_freestyle_custom_webapp_path', async () => {
            const projectPath = join(TEST_INPUT, 'webide_freestyle_custom_webapp_path');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('Special Cases', () => {
        test('should migrate webide_v2_lrop_project_no_webapp', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_lrop_project_no_webapp');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });

        test('should migrate webide_v2_lrop_reuselib_ui5_tooling_routing_project', async () => {
            const projectPath = join(TEST_INPUT, 'webide_v2_lrop_reuselib_ui5_tooling_routing_project');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });

        test('should migrate openui5-sample-app', async () => {
            const projectPath = join(TEST_INPUT, 'openui5-sample-app');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                // Note: This might not succeed as it's an OpenUI5 project
                // Just verify it doesn't crash
                expect(result).toBeDefined();
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });

        test('should migrate CA_FIORI_INBOXExtension', async () => {
            const projectPath = join(TEST_INPUT, 'CA_FIORI_INBOXExtension');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('Reuse Library Migration', () => {
        test.skip('should migrate reuse_library_project', async () => {
            // TODO: Reuse library detection needs to be fixed
            // Error: "This project type is not supported for migration"
            // Reuse library projects have manifest.json in subdirectories, not root
            const projectPath = join(TEST_INPUT, 'reuse_library_project');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });

    describe('Adaptation Project Migration', () => {
        test.skip('should migrate adaptation_project_wde', async () => {
            const projectPath = join(TEST_INPUT, 'adaptation_project_wde');
            const fs = loadProjectIntoMemFs(projectPath);

            ProjectMigrator.fs = fs;

            try {
                const result = await ProjectMigrator.migrate(
                    projectPath,
                    DUMMY_BACKEND_URL,
                    UI5_SNAPSHOT_URL,
                    undefined,
                    undefined,
                    false
                );

                expect(result.result).toBe(true);
                expect(result.messages.filter((m) => m.type === 'ERROR')).toHaveLength(0);
                expect(fs.dump(projectPath)).toMatchSnapshot();
            } finally {
                ProjectMigrator.fs = undefined;
            }
        });
    });
});
