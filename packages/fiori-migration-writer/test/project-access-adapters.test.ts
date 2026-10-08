import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { isFioriToolsProject } from '../src/utils/project-access-adapters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('project-access-adapters', () => {
    const testOutputDir = join(__dirname, 'test-output', 'project-access-adapters');

    beforeEach(async () => {
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    // Note: findAllManifest tests are skipped because findFilesByExtension from @sap-ux/project-access
    // requires specific workspace setup that's difficult to mock in unit tests.
    // The function is tested indirectly through integration tests.

    describe('isFioriToolsProject', () => {
        test('should return true when project has the dependency', async () => {
            const projectDir = join(testOutputDir, 'fiori-project');
            await mkdir(projectDir, { recursive: true });
            await writeFile(
                join(projectDir, 'package.json'),
                JSON.stringify({
                    name: 'test-project',
                    devDependencies: {
                        '@sap-ux/ui5-tooling': '1.0.0'
                    }
                })
            );

            const result = await isFioriToolsProject(projectDir, '@sap-ux/ui5-tooling');
            expect(result).toBe(true);
        });

        test('should return false when project does not have the dependency', async () => {
            const projectDir = join(testOutputDir, 'non-fiori-project');
            await mkdir(projectDir, { recursive: true });
            await writeFile(
                join(projectDir, 'package.json'),
                JSON.stringify({
                    name: 'test-project',
                    devDependencies: {}
                })
            );

            const result = await isFioriToolsProject(projectDir, '@sap-ux/ui5-tooling');
            expect(result).toBe(false);
        });

        test('should return false when package.json does not exist', async () => {
            const projectDir = join(testOutputDir, 'no-package-json');
            await mkdir(projectDir, { recursive: true });

            const result = await isFioriToolsProject(projectDir, '@sap-ux/ui5-tooling');
            expect(result).toBe(false);
        });

        test('should return false for invalid package.json', async () => {
            const projectDir = join(testOutputDir, 'invalid-package');
            await mkdir(projectDir, { recursive: true });
            await writeFile(join(projectDir, 'package.json'), 'invalid json');

            const result = await isFioriToolsProject(projectDir, '@sap-ux/ui5-tooling');
            expect(result).toBe(false);
        });
    });
});
