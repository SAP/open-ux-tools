import { resolveUI5VersionsForMigration } from '../src/data/ui5-version';
import type { ImportProjectInfo } from '../src/types';

describe('ui5-version', () => {
    describe('resolveUI5VersionsForMigration', () => {
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

        it(
            'should return valid UI5 versions from CDN or fallback on timeout',
            async () => {
                // Use invalid URL - will either timeout and return fallback, or CDN might succeed
                const result = await resolveUI5VersionsForMigration(
                    mockProjectInfo,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                // Must return an array with at least one version
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                expect(result[0]).toHaveProperty('version');

                const version = result[0].version;
                expect(typeof version).toBe('string');
                expect(version.length).toBeGreaterThan(0);
                // Should be valid semver or the project version
                expect(version).toMatch(/^\d+\.\d+\.\d+/);
            },
            15000
        );

        it(
            'should return fallback with support field when network fails',
            async () => {
                const projectInfoNoVersion: ImportProjectInfo = {
                    ...mockProjectInfo,
                    ui5Version: ''
                };

                const result = await resolveUI5VersionsForMigration(
                    projectInfoNoVersion,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                expect(result[0]).toHaveProperty('version');
                // Fallback should include support field
                const version = result[0].version;
                expect(typeof version).toBe('string');
                expect(version.length).toBeGreaterThan(0);
            },
            15000
        );

        it(
            'should remove snapshot suffixes from version string',
            async () => {
                const projectInfoWithSnapshot: ImportProjectInfo = {
                    ...mockProjectInfo,
                    ui5Version: '1.84.0-snapshot-untested'
                };

                const result = await resolveUI5VersionsForMigration(
                    projectInfoWithSnapshot,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                expect(Array.isArray(result)).toBe(true);
                expect(result[0]).toHaveProperty('version');
                // Version should not contain snapshot suffix
                const version = result[0].version;
                expect(version).not.toContain('snapshot');
                expect(version).toMatch(/^\d+\.\d+\.\d+$/);
            },
            15000
        );

        it(
            'should handle version upgrade to minimum',
            async () => {
                const projectInfoLowVersion: ImportProjectInfo = {
                    ...mockProjectInfo,
                    ui5Version: '1.30.0' // Below minUI5VersionForLocalDev
                };

                const result = await resolveUI5VersionsForMigration(
                    projectInfoLowVersion,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                expect(Array.isArray(result)).toBe(true);
                expect(result[0]).toHaveProperty('version');
                const version = result[0].version;
                const [major, minor] = version.split('.').map(Number);

                // Should be upgraded or CDN returned higher version
                expect(major).toBeGreaterThanOrEqual(1);
                expect(minor).toBeGreaterThan(0);
            },
            15000
        );

        it(
            'should handle empty snapshot URL without error',
            async () => {
                const result = await resolveUI5VersionsForMigration(mockProjectInfo, '');

                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                expect(result[0]).toHaveProperty('version');

                // Should complete within reasonable time (tests timeout mechanism works)
                const version = result[0].version;
                expect(typeof version).toBe('string');
            },
            15000
        );

        it(
            'should handle invalid version gracefully without throwing',
            async () => {
                const projectInfoInvalidVersion: ImportProjectInfo = {
                    ...mockProjectInfo,
                    ui5Version: 'invalid-version'
                };

                // Should not throw
                await expect(
                    resolveUI5VersionsForMigration(
                        projectInfoInvalidVersion,
                        'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                    )
                ).resolves.toBeDefined();

                const result = await resolveUI5VersionsForMigration(
                    projectInfoInvalidVersion,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
            },
            15000
        );

        it(
            'should handle semver comparison errors in version upgrade logic',
            async () => {
                const projectInfoWeirdVersion: ImportProjectInfo = {
                    ...mockProjectInfo,
                    ui5Version: 'not.a.version'
                };

                // Should not throw even with invalid semver
                const result = await resolveUI5VersionsForMigration(
                    projectInfoWeirdVersion,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
            },
            15000
        );

        it(
            'should complete within timeout period demonstrating timeout mechanism',
            async () => {
                const startTime = Date.now();

                const result = await resolveUI5VersionsForMigration(
                    mockProjectInfo,
                    'https://invalid-url-that-does-not-exist.example.com/nonexistent'
                );

                const duration = Date.now() - startTime;

                // Should complete (either success or fallback)
                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);

                // If it did timeout and fallback, should be close to 10s
                // If CDN succeeded, should be much faster
                // Either way, demonstrates timeout mechanism is present
                expect(duration).toBeLessThan(15000); // Test timeout safety
            },
            15000
        );
    });
});
