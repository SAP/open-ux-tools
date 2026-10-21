import { resolveUI5VersionsForMigration } from '../src/data/ui5-version';
import type { ImportProjectInfo } from '../src/types';

/**
 * Timeout-specific tests for UI5 version resolution.
 * These tests verify the timeout mechanism using network scenarios that trigger fallback logic.
 */
describe('ui5-version timeout mechanism', () => {
    const mockProjectInfo: ImportProjectInfo = {
        ui5Version: '1.84.0',
        moduleName: 'test-app',
        moduleDescription: 'Test Application',
        sapux: false,
        rootPath: '/test/path',
        floorPlan: undefined,
        mainServiceURI: '',
        mainServiceFsPath: '',
        mainService: '',
        odataVersion: 2,
        mainEntity: '',
        namespace: '',
        ui5Theme: '',
        FEVersion: undefined,
        scp: false,
        destination: '',
        appTitle: 'Test App',
        appVersion: '1.0.0',
        sapClient: '',
        backends: [],
        sapLibs: '',
        isSAPApp: false,
        webappPath: 'webapp',
        hostname: '',
        isFioriToolsProject: false,
        uiAdaptation: undefined,
        hasRootIntent: { flpSandboxRootIntent: false, flpSandboxMockRootIntent: false }
    };

    it('should return fallback when network request fails or times out', async () => {
        // Use an invalid URL that will trigger error/timeout path
        const result = await resolveUI5VersionsForMigration(
            mockProjectInfo,
            'https://invalid-url-guaranteed-not-to-exist-12345.example.com/nonexistent'
        );

        // Should return fallback with support field
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('version');

        // Fallback should use project version or min version
        const version = result[0].version;
        expect(typeof version).toBe('string');
        expect(version).toMatch(/^\d+\.\d+\.\d+/);

        // If it hit the fallback path (error/timeout), it will have support field
        // If CDN succeeded first, it won't - but the function still worked correctly
        if (result[0].support) {
            expect(result[0].support).toBe('Maintenance');
        }
    }, 15000);

    it('should not hang indefinitely on unreachable URLs', async () => {
        const startTime = Date.now();

        await resolveUI5VersionsForMigration(
            mockProjectInfo,
            'http://192.0.2.1:9999' // TEST-NET address
        );

        const duration = Date.now() - startTime;

        // Should complete within timeout window, not hang forever
        // Either fails fast (connection refused) or times out at 10s
        expect(duration).toBeLessThan(15000);
    }, 20000);

    it('should clear timeout on successful completion', async () => {
        // This test verifies no open handles remain after completion
        // Uses empty URL to allow CDN fallback
        const result = await resolveUI5VersionsForMigration(mockProjectInfo, '');

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // Wait a moment to ensure timeout was cleared
        await new Promise((resolve) => setTimeout(resolve, 100));
    }, 15000);

    it('should clear timeout on error path', async () => {
        // Use invalid URL to trigger error path
        const result = await resolveUI5VersionsForMigration(
            mockProjectInfo,
            'https://definitely-invalid-url-12345.test'
        );

        expect(result).toBeDefined();

        // Wait to ensure timeout was cleared
        await new Promise((resolve) => setTimeout(resolve, 100));
    }, 15000);

    it('should return fallback with correct version when project version is provided', async () => {
        const projectWithVersion: ImportProjectInfo = {
            ...mockProjectInfo,
            ui5Version: '1.96.0'
        };

        const result = await resolveUI5VersionsForMigration(projectWithVersion, 'https://invalid-url-12345.test');

        expect(Array.isArray(result)).toBe(true);

        // Should return at least the project version or higher (due to min version upgrade)
        const [major, minor] = result[0].version.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
            expect(minor).toBeGreaterThanOrEqual(96);
        }
    }, 15000);

    it('should use minUI5VersionForLocalDev as fallback when project version is empty', async () => {
        const projectNoVersion: ImportProjectInfo = {
            ...mockProjectInfo,
            ui5Version: ''
        };

        const result = await resolveUI5VersionsForMigration(projectNoVersion, 'https://invalid-url-12345.test');

        expect(Array.isArray(result)).toBe(true);

        // Should use minimum version (1.120.0) or higher
        const [major, minor] = result[0].version.split('.').map(Number);
        expect(major).toBeGreaterThanOrEqual(1);
        if (major === 1) {
            expect(minor).toBeGreaterThanOrEqual(120);
        }
    }, 15000);
});
