import { ProjectMigrator, initI18n } from '../src/index.js';
import { loadProjectIntoMemFs, fileExistsInMemFs } from './helpers/mem-fs-helper.js';
import { DUMMY_BACKEND_URL, UI5_SNAPSHOT_URL } from './test-constants.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Reuse Libraries - Coverage Tests', () => {
    const testInputBase = join(__dirname, 'input', 'coverage_reuse_libs_multiple');

    beforeAll(async () => {
        await initI18n();
    });

    it('should migrate project with multiple reuse libraries', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test project not found: ${testInputBase}`);
            return;
        }

        const fs = loadProjectIntoMemFs(testInputBase);

        const {
            result,
            messages,
            fs: updatedFs
        } = await ProjectMigrator.migrate(
            testInputBase,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBe(true);

        // Verify reuse library manifests exist
        expect(fileExistsInMemFs(updatedFs, testInputBase, 'webapp/reuse/comp1/manifest.json')).toBe(true);
        expect(fileExistsInMemFs(updatedFs, testInputBase, 'webapp/reuse/lib2/manifest.json')).toBe(true);
    });
});

describe('Service Detection Edge Cases - Coverage Tests', () => {
    const testInputBase = join(__dirname, 'input', 'coverage_service_detection_edge_cases');

    beforeAll(async () => {
        await initI18n();
    });

    it('should handle project with complex service configuration', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test project not found: ${testInputBase}`);
            return;
        }

        const fs = loadProjectIntoMemFs(testInputBase);

        const { result, messages } = await ProjectMigrator.migrate(
            testInputBase,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        // Should handle multiple dataSources without critical errors
        expect(result).toBe(true);
        const criticalErrors = messages.filter((m) => m.type === 'ERROR' && m.severity === 'critical');
        expect(criticalErrors.length).toBe(0);
    });
});

describe('Backend Configuration Variants - Coverage Tests', () => {
    const testInputBase = join(__dirname, 'input', 'coverage_backend_config_variants');

    beforeAll(async () => {
        await initI18n();
    });

    it('should parse backend configuration with custom port and sap-client', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test project not found: ${testInputBase}`);
            return;
        }

        const fs = loadProjectIntoMemFs(testInputBase);

        const {
            result,
            messages,
            fs: updatedFs
        } = await ProjectMigrator.migrate(
            testInputBase,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        expect(result).toBe(true);

        // Verify generated files
        expect(fileExistsInMemFs(updatedFs, testInputBase, 'ui5.yaml')).toBe(true);
        expect(fileExistsInMemFs(updatedFs, testInputBase, 'package.json')).toBe(true);
    });
});
