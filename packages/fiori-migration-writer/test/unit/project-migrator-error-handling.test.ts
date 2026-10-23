import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import type { Editor } from 'mem-fs-editor';
import { createMemFsEditor } from '../../src/utils/fs-adapter.js';
import { initI18n } from '../../src/i18n.js';
import {
    defaultMinUi5Version,
    defaultVersion,
    getDefaultUI5Theme,
    getLatestUI5Version,
    getSapSystemUI5Version,
    getUi5Themes,
    latestVersionString,
    minSupportedSpecVersion,
    minUI5VersionForLocalDev,
    minUi5VersionV4Template,
    supportedUi5VersionFallbacks,
    ui5ThemeIds,
    ui5Themes,
    ui5VersionRequestInfo
} from '@sap-ux/ui5-info';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock getUI5Versions to throw an error to trigger the catch block
jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    defaultMinUi5Version,
    defaultVersion,
    getDefaultUI5Theme,
    getLatestUI5Version,
    getSapSystemUI5Version,
    getUI5Versions: jest.fn().mockRejectedValue(new Error('Network error')),
    getUi5Themes,
    latestVersionString,
    minSupportedSpecVersion,
    minUI5VersionForLocalDev,
    minUi5VersionV4Template,
    supportedUi5VersionFallbacks,
    ui5ThemeIds,
    ui5Themes,
    ui5VersionRequestInfo
}));

// Import after mocking
const { ProjectMigrator } = await import('../../src/ProjectMigrator.js');

describe('ProjectMigrator - Error Handling', () => {
    let fs: Editor;
    const testOutputDir = join(__dirname, 'test-output', 'error-handling');

    beforeEach(async () => {
        await initI18n();
        fs = createMemFsEditor();
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
        jest.clearAllMocks();
    });

    it(
        'should handle exceptions during migration with proper error message fallback',
        async () => {
            // Create a valid project structure so validation passes
            const projectName = 'error-catch-test';
            const absoluteProjectRoot = join(testOutputDir, projectName);
            await mkdir(join(absoluteProjectRoot, 'webapp'), { recursive: true });

            await writeFile(
                join(absoluteProjectRoot, 'webapp', 'manifest.json'),
                JSON.stringify({
                    'sap.app': { id: 'test.errorCatch', type: 'application' },
                    'sap.ui5': { dependencies: { minUI5Version: '1.84.0' } }
                })
            );

            await writeFile(
                join(absoluteProjectRoot, 'package.json'),
                JSON.stringify({ name: 'test-error-catch', sapux: true })
            );

            // Call migrate - getUI5Versions will throw, triggering the catch block
            const { result, messages } = await ProjectMigrator.migrate({
                projectRoot: absoluteProjectRoot,
                baseUri: 'https://backend.example.com',
                fs
            });

            // Should fail with error from catch block
            expect(result).toBe(false);
            expect(messages.length).toBeGreaterThan(0);

            // Should have error message from catch block with "Error during migration:"
            const errorMessages = messages.filter((m) => m.type === 'ERROR');
            expect(errorMessages.length).toBeGreaterThan(0);

            // Verify error message fallback chain is exercised
            const migrationError = errorMessages.find((m) => m.description.includes('Error during migration'));
            expect(migrationError).toBeDefined();
            expect(migrationError?.description).toBeTruthy();
            expect(migrationError?.description.length).toBeGreaterThan('Error during migration: '.length);
        },
        15000
    );
});
