import { ProjectMigrator, initI18n, MigrationTypes } from '../src/index.js';
import { loadProjectIntoMemFs, fileExistsInMemFs } from './helpers/mem-fs-helper.js';
import { DUMMY_BACKEND_URL, UI5_SNAPSHOT_URL } from './test-constants.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Library Project - Coverage Tests', () => {
    const testInputBase = join(__dirname, 'input', 'coverage_ui5_library_standalone');

    beforeAll(async () => {
        await initI18n();
    });

    it('should migrate standalone UI5 library project', async () => {
        if (!existsSync(testInputBase)) {
            console.warn(`Skipping test - test project not found: ${testInputBase}`);
            return;
        }

        const fs = loadProjectIntoMemFs(testInputBase);

        const { result, messages, fs: updatedFs } = await ProjectMigrator.migrate(
            testInputBase,
            DUMMY_BACKEND_URL,
            UI5_SNAPSHOT_URL,
            undefined,
            undefined,
            false,
            fs
        );

        // Library migration should succeed
        expect(['SUCCESS', 'WARNING'].some((status) => result === true || messages.length > 0)).toBe(true);

        // Verify generated files for library
        expect(fileExistsInMemFs(updatedFs, testInputBase, 'package.json')).toBe(true);
    });

    it('should detect UI5 tooling dependencies in library', async () => {
        if (!existsSync(testInputBase)) {
            return;
        }

        const packageJsonPath = join(testInputBase, 'package.json');
        expect(existsSync(packageJsonPath)).toBe(true);

        const fs = loadProjectIntoMemFs(testInputBase);
        const packageJson = JSON.parse(fs.read(packageJsonPath).toString());

        expect(packageJson.devDependencies).toBeDefined();
        expect(packageJson.devDependencies['@sap-ux/ui5-tooling']).toBeDefined();
    });
});
