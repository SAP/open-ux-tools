import { BulkProjectMigrator, initI18n } from '../../src/index.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copy, remove, pathExists } from 'fs-extra';
import { tmpdir } from 'node:os';
import type { MigrationUIProjectInfo } from '../../src/types.js';
import { UI5_SNAPSHOT_URL } from '../test-constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_INPUT = join(__dirname, '../fixtures/input');

describe('BulkProjectMigrator - Coverage Tests', () => {
    let tempDir: string;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(async () => {
        // Create unique temp directory for each test
        tempDir = join(tmpdir(), `bulk-migration-coverage-${Date.now()}`);
    });

    afterEach(async () => {
        // Clean up temp directory after each test
        if (tempDir && (await pathExists(tempDir))) {
            await remove(tempDir);
        }
    });

    it('should migrate multiple projects with different outcomes', async () => {
        // Copy test projects to temp directory to avoid modifying fixtures
        const projectConfigs = [
            { name: 'tool_suite_beta_lrop_v2_project', expectSuccess: true },
            { name: 'openui5-sample-app', expectSuccess: true }
        ];

        const projects: MigrationUIProjectInfo[] = [];

        for (const config of projectConfigs) {
            const srcPath = join(TEST_INPUT, config.name);
            const destPath = join(tempDir, config.name);
            await copy(srcPath, destPath);
            projects.push({
                rootPath: destPath,
                hostname: 'https://dummy.example.com',
                moduleName: `com.example.bulk.${config.name.replace(/-/g, '_')}`
            } as MigrationUIProjectInfo);
        }

        const migrator = new BulkProjectMigrator();
        const results = await migrator.migrate(projects, UI5_SNAPSHOT_URL);

        // Should return results for all projects
        expect(results).toHaveLength(projectConfigs.length);

        // At least one should succeed
        const successCount = results.filter((r) => r.status === 'SUCCESS').length;
        expect(successCount).toBeGreaterThan(0);
    });

    it('should handle empty project list', async () => {
        const migrator = new BulkProjectMigrator();
        const results = await migrator.migrate([], UI5_SNAPSHOT_URL);

        expect(results).toHaveLength(0);
    });

    it('should continue processing after encountering an error in one project', async () => {
        // Copy projects - one will be modified to be invalid
        const projectConfigs = [
            { name: 'openui5-sample-app', makeInvalid: true },
            { name: 'tool_suite_beta_lrop_v2_project', makeInvalid: false }
        ];

        const projects: MigrationUIProjectInfo[] = [];

        for (const config of projectConfigs) {
            const srcPath = join(TEST_INPUT, config.name);
            const destPath = join(tempDir, config.name);
            await copy(srcPath, destPath);

            if (config.makeInvalid) {
                // Remove manifest.json to make it an invalid project
                const manifestPath = join(destPath, 'webapp', 'manifest.json');
                if (await pathExists(manifestPath)) {
                    await remove(manifestPath);
                }
            }

            projects.push({
                rootPath: destPath,
                hostname: 'https://dummy.example.com',
                moduleName: `com.example.bulk.${config.name.replace(/-/g, '_')}`
            } as MigrationUIProjectInfo);
        }

        const migrator = new BulkProjectMigrator();
        const results = await migrator.migrate(projects, UI5_SNAPSHOT_URL);

        // Should return results for all projects
        expect(results).toHaveLength(2);

        // First project should fail (no manifest)
        expect(results[0].status).toBe('ERROR');

        // Second project should NOT be ERROR (migration continues despite first error)
        expect(['SUCCESS', 'WARNING']).toContain(results[1].status);
    });
});
