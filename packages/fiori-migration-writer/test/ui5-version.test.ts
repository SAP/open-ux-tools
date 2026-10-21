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
            'should return a fallback result within timeout period when network is unavailable',
            async () => {
                // Use an unreachable URL to trigger timeout
                const result = await resolveUI5VersionsForMigration(mockProjectInfo, 'https://invalid-url-that-does-not-exist.example.com/nonexistent');

                // Should return fallback version
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
                expect(result[0]).toHaveProperty('version');
                expect(result[0].version).toBe('1.84.0');
            },
            15000 // 15 second timeout for the test itself
        );

        it('should handle project without UI5 version', async () => {
            const projectInfoNoVersion: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: ''
            };

            const result = await resolveUI5VersionsForMigration(projectInfoNoVersion, 'https://invalid-url-that-does-not-exist.example.com/nonexistent');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            // Should fall back to minUI5VersionForLocalDev
            expect(result[0]).toHaveProperty('version');
        }, 15000);

        it('should remove snapshot suffixes from version string', async () => {
            const projectInfoWithSnapshot: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: '1.84.0-snapshot-untested'
            };

            const result = await resolveUI5VersionsForMigration(projectInfoWithSnapshot, 'https://invalid-url-that-does-not-exist.example.com/nonexistent');

            expect(Array.isArray(result)).toBe(true);
            // Snapshot suffix should be removed and may be upgraded to minimum version
            expect(result[0]).toHaveProperty('version');
            expect(result[0].version).toMatch(/^\d+\.\d+\.\d+$/); // Valid semver format
        }, 15000);
    });
});
