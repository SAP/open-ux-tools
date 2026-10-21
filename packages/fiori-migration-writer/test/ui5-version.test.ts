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

        it('should return valid UI5 versions array', async () => {
            const result = await resolveUI5VersionsForMigration(mockProjectInfo, '');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('version');
            expect(typeof result[0].version).toBe('string');
            expect(result[0].version).toMatch(/^\d+\.\d+\.\d+/);
        }, 15000);

        it('should use minUI5Version when project version is empty', async () => {
            const projectInfoNoVersion: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: ''
            };

            const result = await resolveUI5VersionsForMigration(projectInfoNoVersion, '');

            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('version');
            const [major, minor] = result[0].version.split('.').map(Number);
            // Should be at least 1.120.0 (minUI5VersionForLocalDev)
            expect(major).toBeGreaterThanOrEqual(1);
            if (major === 1) {
                expect(minor).toBeGreaterThanOrEqual(120);
            }
        }, 15000);

        it('should remove snapshot suffixes from version string', async () => {
            const projectInfoWithSnapshot: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: '1.84.0-snapshot-untested'
            };

            const result = await resolveUI5VersionsForMigration(projectInfoWithSnapshot, '');

            expect(Array.isArray(result)).toBe(true);
            const version = result[0].version;
            expect(version).not.toContain('snapshot');
            expect(version).toMatch(/^\d+\.\d+\.\d+/);
        }, 15000);

        it('should handle project with version below minimum', async () => {
            const projectInfoLowVersion: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: '1.30.0'
            };

            const result = await resolveUI5VersionsForMigration(projectInfoLowVersion, '');

            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('version');
            // CDN may return a version list that includes the upgrade logic result
            // or may return available versions - either is valid
            const version = result[0].version;
            expect(version).toMatch(/^\d+\.\d+\.\d+/);
        }, 15000);

        it('should handle invalid version gracefully without throwing', async () => {
            const projectInfoInvalidVersion: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: 'invalid-version'
            };

            await expect(resolveUI5VersionsForMigration(projectInfoInvalidVersion, '')).resolves.toBeDefined();

            const result = await resolveUI5VersionsForMigration(projectInfoInvalidVersion, '');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        }, 15000);

        it('should handle semver comparison errors in version upgrade logic', async () => {
            const projectInfoWeirdVersion: ImportProjectInfo = {
                ...mockProjectInfo,
                ui5Version: 'not.a.version'
            };

            const result = await resolveUI5VersionsForMigration(projectInfoWeirdVersion, '');

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('version');
        }, 15000);

        it('should complete within reasonable time and not hang indefinitely', async () => {
            const startTime = Date.now();

            const result = await resolveUI5VersionsForMigration(mockProjectInfo, '');

            const duration = Date.now() - startTime;

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            // Should complete quickly (CDN) or within timeout (10s) - never hang forever
            expect(duration).toBeLessThan(15000);
        }, 20000);

        it('should handle snapshot URL parameter', async () => {
            const result = await resolveUI5VersionsForMigration(mockProjectInfo, 'https://ui5.sap.com/snapshot');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('version');
        }, 15000);
    });
});
