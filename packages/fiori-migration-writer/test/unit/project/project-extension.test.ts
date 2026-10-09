import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processProjectExtension, type ProcessProjectExtensionConfig } from '../../../src/project/project-extension.js';
import type { ImportProjectInfo } from '../../../src/types.js';
import { MigrationTypes } from '../../../src/utils/constants.js';
import { initI18n } from '../../../src/index.js';

describe('project-extension', () => {
    beforeEach(async () => {
        await initI18n();
    });

    const createDefaultProjectInfo = (): ImportProjectInfo =>
        ({
            moduleName: '',
            moduleDescription: '',
            rootPath: '',
            webappPath: 'webapp',
            destination: '',
            sapClient: '',
            hostname: '',
            ui5Version: '',
            manifestUI5Version: '',
            localUI5Version: '',
            ui5Theme: 'sap_fiori_3',
            isFioriToolsProject: false,
            isSAPApp: false,
            type: MigrationTypes.lrop
        }) as ImportProjectInfo;

    const createMockConfig = (overrides: Partial<ProcessProjectExtensionConfig> = {}): ProcessProjectExtensionConfig => ({
        projectRoot: '/test/project',
        defaultProjectInfo: createDefaultProjectInfo(),
        projectInfo: { ...createDefaultProjectInfo(), webappPath: 'webapp', destination: 'TEST_DEST' },
        manifest: {
            'sap.app': { id: 'test.extension', type: 'application' },
            'sap.ui': { supportedThemes: ['sap_fiori_3', 'sap_bluecrystal'] },
            'sap.ui5': { dependencies: { minUI5Version: '1.120.0' } }
        },
        getPackageJson: jest.fn<() => Promise<{ version?: string }>>().mockResolvedValue({ version: '1.0.0' }),
        hasUI5Tooling: jest.fn<() => boolean>().mockReturnValue(true),
        readProjectExtensionSettings: jest.fn<() => Promise<unknown>>().mockResolvedValue({ namespace: 'base.app' }),
        getExtensionProjectModuleName: jest.fn<() => string>().mockReturnValue('test.extension'),
        getDestinationFromNeoApp: jest.fn<() => Promise<{ destination?: string; neoAppUI5Version?: string } | undefined>>().mockResolvedValue({
            destination: 'NEO_DEST',
            neoAppUI5Version: '1.120.0',
            neoappDestinations: []
        }),
        getFirstBackend: jest.fn<() => Promise<{ destination?: string; scp?: boolean; url?: string; sapClient?: string } | undefined>>().mockResolvedValue({
            destination: 'BACKEND_DEST',
            scp: true,
            url: 'https://backend.example.com',
            sapClient: '100'
        }),
        getClientFromDestinationName: jest.fn<() => string>().mockReturnValue('200'),
        getFlpIntentFromHtml: jest.fn<() => Promise<string | undefined>>().mockResolvedValue('Semantic-action'),
        getManifestJson: jest.fn<() => Promise<{ 'sap.app'?: { _version?: string } }>>().mockResolvedValue({ 'sap.app': { _version: '1.5.0' } }),
        ...overrides
    });

    describe('processProjectExtension', () => {
        it('should process extension project with all data available', async () => {
            const config = createMockConfig();

            const result = await processProjectExtension(config);

            expect(result.moduleName).toBe('test.extension');
            expect(result.type).toBe(MigrationTypes.projectExtension);
            expect(result.isSAPApp).toBe(true);
            expect(result.isFioriToolsProject).toBe(true);
            expect(result.destination).toBe('NEO_DEST');
            expect(result.scp).toBe(true);
            expect(result.sapClient).toBe('200');
            expect(result.hostname).toBe('https://backend.example.com');
            expect(result.ui5Theme).toBe('sap_fiori_3');
            // FLP intent is set on projectInfo parameter, not result
            expect(result.appVersion).toBe('1.0.0');
            expect(result.manifestUI5Version).toBe('1.120.0');
        });

        it('should handle missing package.json gracefully', async () => {
            const config = createMockConfig({
                getPackageJson: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('ENOENT'))
            });

            const result = await processProjectExtension(config);

            // Should still return result, not throw
            expect(result.moduleName).toBe('test.extension');
            expect(result.isFioriToolsProject).toBe(false);
        });

        it('should use manifest version when package.json version is missing', async () => {
            const config = createMockConfig({
                getPackageJson: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('ENOENT')),
                getManifestJson: jest.fn<() => Promise<{ 'sap.app'?: { _version?: string } }>>().mockResolvedValue({
                    'sap.app': { _version: '2.5.0' }
                })
            });

            const result = await processProjectExtension(config);

            expect(result.appVersion).toBe('2.5.0');
        });

        it('should default to 2.0.0 when both package.json and manifest fail', async () => {
            const config = createMockConfig({
                getPackageJson: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('ENOENT')),
                getManifestJson: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('ENOENT'))
            });

            const result = await processProjectExtension(config);

            expect(result.appVersion).toBe('2.0.0');
        });

        it('should handle missing neo app data', async () => {
            const config = createMockConfig({
                getDestinationFromNeoApp: jest.fn<() => Promise<undefined>>().mockResolvedValue(undefined)
            });

            const result = await processProjectExtension(config);

            // Should use backend destination instead
            expect(result.destination).toBe('BACKEND_DEST');
        });

        it('should handle missing backend data', async () => {
            const config = createMockConfig({
                getFirstBackend: jest.fn<() => Promise<undefined>>().mockResolvedValue(undefined)
            });

            const result = await processProjectExtension(config);

            // Should still have destination from neoapp
            expect(result.destination).toBe('NEO_DEST');
        });

        it('should use sap_bluecrystal theme when sap_fiori_3 not in supportedThemes', async () => {
            const config = createMockConfig({
                manifest: {
                    'sap.app': { id: 'test.extension', type: 'application' },
                    'sap.ui': { supportedThemes: ['sap_bluecrystal', 'sap_hcb'] },
                    'sap.ui5': { dependencies: { minUI5Version: '1.96.0' } }
                }
            });

            const result = await processProjectExtension(config);

            expect(result.ui5Theme).toBe('sap_bluecrystal');
        });

        it('should set FLP intent on projectInfo when found', async () => {
            const projectInfo = { ...createDefaultProjectInfo(), webappPath: 'webapp', destination: 'TEST_DEST' };
            const config = createMockConfig({
                projectInfo,
                getFlpIntentFromHtml: jest.fn<() => Promise<string | undefined>>().mockResolvedValue('Semantic-action')
            });

            await processProjectExtension(config);

            // FLP intent is set on the passed projectInfo object
            expect(projectInfo.flpSandboxFlpIntent).toBe('#Semantic-action');
        });

        it('should handle missing FLP intent', async () => {
            const config = createMockConfig({
                getFlpIntentFromHtml: jest.fn<() => Promise<undefined>>().mockResolvedValue(undefined)
            });

            const result = await processProjectExtension(config);

            expect(result.flpSandboxFlpIntent).toBeUndefined();
        });

        it('should handle undefined manifest', async () => {
            const config = createMockConfig({
                manifest: undefined
            });

            const result = await processProjectExtension(config);

            expect(result.manifestUI5Version).toBe('');
            expect(result.ui5Theme).toBe('sap_bluecrystal');
        });

        it('should include neoappDestinations when available', async () => {
            const destinations = [
                { name: 'dest1', path: '/api1' },
                { name: 'dest2', path: '/api2' }
            ];
            const config = createMockConfig({
                getDestinationFromNeoApp: jest.fn<() => Promise<{ destination?: string; neoAppUI5Version?: string; neoappDestinations?: typeof destinations }>>().mockResolvedValue({
                    destination: 'MAIN_DEST',
                    neoAppUI5Version: '1.120.0',
                    neoappDestinations: destinations
                })
            });

            const result = await processProjectExtension(config);

            expect(result.neoappDestinations).toEqual(destinations);
        });

        it('should use hasUI5Tooling to check for Fiori Tools project', async () => {
            const hasUI5ToolingMock = jest.fn<() => boolean>().mockReturnValue(false);
            const config = createMockConfig({
                hasUI5Tooling: hasUI5ToolingMock
            });

            const result = await processProjectExtension(config);

            expect(hasUI5ToolingMock).toHaveBeenCalled();
            expect(result.isFioriToolsProject).toBe(false);
        });
    });
});
