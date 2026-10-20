import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { checkForMigration, readMigrationSettingsFile } from '../../../src/utils/checkForMigration.js';

describe('utils/checkForMigration', () => {
    const testRoot = join(tmpdir(), 'check-migration-test-' + Date.now());

    beforeEach(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testRoot)) {
            rmSync(testRoot, { recursive: true, force: true });
        }
    });

    describe('readMigrationSettingsFile', () => {
        it('should return object when settings file does not exist', async () => {
            const result: unknown = await readMigrationSettingsFile();
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });

    describe('checkForMigration', () => {
        it('should return false for project with @sap-ux/ui5-tooling dependency', async () => {
            const projectPath = join(testRoot, 'fiori-tools-project');
            mkdirSync(join(projectPath, 'webapp'), { recursive: true });
            writeFileSync(
                join(projectPath, 'package.json'),
                JSON.stringify({
                    name: 'test-app',
                    version: '1.0.0',
                    devDependencies: {
                        '@sap-ux/ui5-tooling': '^1.0.0'
                    }
                })
            );
            writeFileSync(
                join(projectPath, 'webapp', 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'test.app',
                        type: 'application'
                    }
                })
            );

            const result = await checkForMigration(projectPath, 'application');
            expect(result).toBe(false);
        });

        it('should return false for project with @sap/ux-ui5-tooling dependency', async () => {
            const projectPath = join(testRoot, 'sap-ui5-tooling-project');
            mkdirSync(join(projectPath, 'webapp'), { recursive: true });
            writeFileSync(
                join(projectPath, 'package.json'),
                JSON.stringify({
                    name: 'test-app',
                    version: '1.0.0',
                    devDependencies: {
                        '@sap/ux-ui5-tooling': '^1.0.0'
                    }
                })
            );
            writeFileSync(
                join(projectPath, 'webapp', 'manifest.json'),
                JSON.stringify({
                    'sap.app': {
                        id: 'test.app',
                        type: 'application'
                    }
                })
            );

            const result = await checkForMigration(projectPath, 'application');
            expect(result).toBe(false);
        });

        it('should handle non-existent project path', async () => {
            const nonExistentPath = join(testRoot, 'does-not-exist');
            const result = await checkForMigration(nonExistentPath, 'application');
            // Should not throw, returns boolean
            expect(typeof result).toBe('boolean');
        });

        it('should handle project with invalid package.json', async () => {
            const projectPath = join(testRoot, 'invalid-package');
            mkdirSync(projectPath, { recursive: true });
            writeFileSync(join(projectPath, 'package.json'), 'not valid json');

            const result = await checkForMigration(projectPath, 'application');
            expect(typeof result).toBe('boolean');
        });

        it('should accept optional libPath parameter for library type', async () => {
            const projectPath = join(testRoot, 'lib-project');
            mkdirSync(projectPath, { recursive: true });
            writeFileSync(
                join(projectPath, 'package.json'),
                JSON.stringify({
                    name: 'test-lib',
                    version: '1.0.0'
                })
            );

            const libPath = join(testRoot, 'some-lib');
            const result = await checkForMigration(projectPath, 'library', libPath);
            expect(typeof result).toBe('boolean');
        });
    });
});
