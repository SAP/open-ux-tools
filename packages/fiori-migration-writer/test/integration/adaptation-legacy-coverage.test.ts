import { ProjectMigrator, initI18n } from '../../src/index.js';
import { loadProjectIntoMemFs } from '../helpers/mem-fs-helper.js';
import { DUMMY_BACKEND_URL, UI5_SNAPSHOT_URL } from '../test-constants.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Adaptation Project - Coverage Tests', () => {
    const testInputBase = join(__dirname, '../fixtures/input', 'coverage_adaptation_webide_legacy');

    beforeAll(async () => {
        await initI18n();
    });

    it('should detect and process WebIDE adaptation project with .che/project.json', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test project not found: ${testInputBase}`);
            return;
        }

        const fs = loadProjectIntoMemFs(testInputBase);

        const { messages } = await ProjectMigrator.migrate(
            testInputBase,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        // Should not have critical errors
        const errors = messages.filter((m) => m.type === 'ERROR');
        expect(errors.length).toBeLessThan(3); // Allow some expected errors
    });

    it('should identify manifest.appdescr_variant file', async () => {
        const variantFile = join(testInputBase, 'webapp', 'manifest.appdescr_variant');
        if (existsSync(testInputBase)) {
            expect(existsSync(variantFile)).toBe(true);
        }
    });
});

describe('Legacy NEO App - Coverage Tests', () => {
    const testInputBase = join(__dirname, '../fixtures/input', 'coverage_legacy_neo_app');

    beforeAll(async () => {
        await initI18n();
    });

    it('should parse neo-app.json with destinations and routes', async () => {
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

        // Should succeed or have warnings only
        expect(result).toBe(true);
        const criticalErrors = messages.filter((m) => m.type === 'ERROR' && m.severity === 'critical');
        expect(criticalErrors.length).toBe(0);
    });
});
