/* eslint-disable sonarjs/no-implicit-dependencies */
/* eslint-disable import/no-unresolved */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { handlePackageJsonFile } from '../src/utils/template-generators/file-handlers.js';

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

            const result = await handlePackageJsonFile(testRoot, targetFile, templateContent, { project: {} });
            const parsed = JSON.parse(result);

            // Assert legacy modules are removed
            expect(parsed.dependencies?.['valid-dep']).toBe('2.0.0');
            expect(parsed.devDependencies?.['@ui5/fs']).toBeUndefined();
            expect(parsed.devDependencies?.['@sap/grunt-sapui5-bestpractice-build']).toBeUndefined();
            expect(parsed.devDependencies?.['@sap-ux/specification']).toBeUndefined();
            expect(parsed.devDependencies?.['@sap/ux-specification']).toBeUndefined();
            expect(parsed.devDependencies?.['valid-dev-dep']).toBe('3.0.0');
        });
    });
});
