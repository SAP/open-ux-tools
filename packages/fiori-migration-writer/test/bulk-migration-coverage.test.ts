import { BulkProjectMigrator, initI18n } from '../src/index.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { MigrationUIProjectInfo } from '../src/types.js';
import { UI5_SNAPSHOT_URL } from './test-constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe.skip('BulkProjectMigrator - Coverage Tests', () => {
    // TODO: These tests modify test/input/ directories directly via BulkProjectMigrator
    // which doesn't support mem-fs. Need to copy projects to temp directories first.
    // Skipping until proper temp directory setup is implemented.
    const testInputBase = join(__dirname, 'input', 'coverage_bulk_multi_project');

    beforeAll(async () => {
        await initI18n();
    });

    it('should migrate multiple projects with different outcomes (SUCCESS, WARNING, ERROR)', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test projects not found: ${testInputBase}`);
            return;
        }

        const projects: MigrationUIProjectInfo[] = [
            {
                rootPath: join(testInputBase, 'project1_simple'),
                hostname: 'https://dummy.example.com',
                moduleName: 'com.example.bulk.project1'
            },
            {
                rootPath: join(testInputBase, 'project2_with_warning'),
                hostname: 'https://dummy.example.com',
                moduleName: 'com.example.bulk.project2'
            },
            {
                rootPath: join(testInputBase, 'project3_error'),
                hostname: 'https://dummy.example.com',
                moduleName: 'com.example.bulk.project3'
            }
        ];

        const migrator = new BulkProjectMigrator();
        const results = await migrator.migrate(projects, UI5_SNAPSHOT_URL);

        expect(results).toHaveLength(3);

        // Project 1: Should succeed or have warnings
        const project1 = results.find((r) => r.rootPath.includes('project1_simple'));
        expect(['SUCCESS', 'WARNING']).toContain(project1?.status);

        // Project 2: Should have warnings or success (missing deps might just be a warning)
        const project2 = results.find((r) => r.rootPath.includes('project2_with_warning'));
        expect(['SUCCESS', 'WARNING']).toContain(project2?.status);

        // Project 3: Should error (no manifest.json)
        const project3 = results.find((r) => r.rootPath.includes('project3_error'));
        expect(project3?.status).toBe('ERROR');
    });

    it('should handle empty project list', async () => {
        const migrator = new BulkProjectMigrator();
        const results = await migrator.migrate([], UI5_SNAPSHOT_URL);

        expect(results).toHaveLength(0);
    });

    it('should continue processing after encountering an error in one project', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test projects not found: ${testInputBase}`);
            return;
        }

        const projects: MigrationUIProjectInfo[] = [
            {
                rootPath: join(testInputBase, 'project3_error'),
                hostname: 'https://dummy.example.com',
                moduleName: 'com.example.bulk.project3'
            },
            {
                rootPath: join(testInputBase, 'project1_simple'),
                hostname: 'https://dummy.example.com',
                moduleName: 'com.example.bulk.project1'
            }
        ];

        const migrator = new BulkProjectMigrator();
        const results = await migrator.migrate(projects, UI5_SNAPSHOT_URL);

        expect(results).toHaveLength(2);

        // First should be ERROR
        const firstResult = results[0];
        expect(firstResult.status).toBe('ERROR');

        // Second should NOT be ERROR (migration continues despite first error)
        const secondResult = results[1];
        expect(['SUCCESS', 'WARNING']).toContain(secondResult.status);
    });
});
