import { jest } from '@jest/globals';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockRunCmdArgs = jest.fn<any>();
const mockFetchKeyUserChanges = jest.fn<any>();
const mockGetConfiguredProvider = jest.fn<any>();
const mockGetSupportedProject = jest.fn<any>();
const mockLoadApps = jest.fn<any>();
const mockLoadCfConfig = jest.fn<any>();
const mockIsCfInstalled = jest.fn<any>();
const mockIsLoggedInCf = jest.fn<any>();
const mockFindServiceInstancesForApp = jest.fn<any>();
const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockLoggerError = jest.fn<any>();
const mockIsInternalFeaturesSettingEnabled = jest.fn<any>();

const SupportedProject = {
    ON_PREM: 'onPremise',
    CLOUD_READY: 'cloudReady',
    CLOUD_READY_AND_ON_PREM: 'cloudReadyAndOnPrem'
} as const;

const AppRouterType = {
    MANAGED: 'Managed HTML5 Application Runtime',
    STANDALONE: 'Standalone HTML5 Application Runtime'
} as const;

const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    runCmdArgs: mockRunCmdArgs,
    logger: {
        ...actualUtils.logger,
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        error: mockLoggerError
    }
}));

jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    fetchKeyUserChanges: mockFetchKeyUserChanges,
    getDefaultProjectName: jest.fn().mockReturnValue('app.variant'),
    getConfiguredProvider: mockGetConfiguredProvider,
    getSupportedProject: mockGetSupportedProject,
    loadApps: mockLoadApps,
    loadCfConfig: mockLoadCfConfig,
    isCfInstalled: mockIsCfInstalled,
    isLoggedInCf: mockIsLoggedInCf,
    findServiceInstancesForApp: mockFindServiceInstancesForApp,
    AppRouterType,
    SupportedProject
}));

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: mockIsInternalFeaturesSettingEnabled
}));

// Force isYoAvailable() to return false so tests always exercise the npx fallback path.
const actualChildProcess = await import('node:child_process');
jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    execFileSync: jest.fn().mockImplementation(() => {
        throw new Error('not found');
    })
}));

const actualFs = await import('node:fs');
const mockMkdir = jest.fn<any>().mockResolvedValue(undefined);
const mockExistsSync = jest.fn<any>().mockReturnValue(false);
const mockWriteFileSync = jest.fn<any>();
const mockRmSync = jest.fn<any>();
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        existsSync: mockExistsSync,
        writeFileSync: mockWriteFileSync,
        rmSync: mockRmSync,
        promises: { ...actualFs.promises, mkdir: mockMkdir }
    },
    existsSync: mockExistsSync,
    writeFileSync: mockWriteFileSync,
    rmSync: mockRmSync,
    promises: { ...actualFs.promises, mkdir: mockMkdir }
}));

const { generateAdaptationProject } = await import('../../../src/tools/generate-adaptation-project.js');

describe('generateAdaptationProject', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(false);
        mockRunCmdArgs.mockResolvedValue({ stdout: 'done', stderr: '' });
        // Default to an on-premise-only system so existing tests resolve to a concrete type
        // and proceed to generation without requiring an explicit projectType.
        mockGetConfiguredProvider.mockResolvedValue({});
        mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);
        mockLoadApps.mockResolvedValue([]);
        // Default to external usage (released-status logic).
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
        // CF defaults: installed, logged in, one matching service instance.
        mockLoadCfConfig.mockReturnValue({
            org: { Name: 'my-org', GUID: 'org-guid' },
            space: { Name: 'my-space', GUID: 'space-guid' },
            token: 'token',
            url: 'eu10.hana.ondemand.com'
        });
        mockIsCfInstalled.mockResolvedValue(true);
        mockIsLoggedInCf.mockResolvedValue(true);
        mockFindServiceInstancesForApp.mockResolvedValue([{ name: 'svc-1', guid: 'si-1' }]);
    });

    test('returns Error when required parameters are missing', async () => {
        const result = await generateAdaptationProject({ system: '', application: '', appPath: '/tmp/app' } as any);

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('application is required');
        expect(mockRunCmdArgs).not.toHaveBeenCalled();
    });

    test('spawns npx with JSON as a single argv element (no shell interpolation)', async () => {
        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'manage.products.odata.lrop.local',
            applicationTitle: "O'Brien's App",
            appPath: '/tmp/app'
        } as any);

        expect(result.status).toEqual('Success');
        expect(mockRunCmdArgs).toHaveBeenCalledTimes(1);
        const [cmd, args, options] = mockRunCmdArgs.mock.calls[0] as [string, string[], any];
        expect(cmd).toEqual('npx');
        expect(args[0]).toEqual('-y');
        expect(args[1]).toEqual('yo@4');
        expect(args[2]).toEqual('@sap-ux/adp');
        expect(args[args.length - 1]).toEqual('--force');
        // The JSON payload is a single, unquoted argv element that round-trips even with apostrophes.
        const payload = JSON.parse(args[3]);
        expect(payload.system).toEqual('UYZ/200');
        expect(payload.application).toEqual('manage.products.odata.lrop.local');
        expect(payload.applicationTitle).toEqual("O'Brien's App");
        expect(options.timeout).toBeGreaterThan(0);
    });

    test('includes optional fields only when provided', async () => {
        await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            namespace: 'my.ns',
            client: '200',
            projectName: 'custom.variant'
        } as any);

        const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
        const payload = JSON.parse(args[3]);
        expect(payload).toMatchObject({
            namespace: 'my.ns',
            client: '200',
            projectName: 'custom.variant'
        });
    });

    test('stages key user changes to a temp file and forwards the correlation id when changes exist', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([{ content: { foo: 'bar' } }]);

        await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
        const payload = JSON.parse(args[3]);
        // The generator reads changes from {tmpdir}/{id}.txt (generator-adp #5079), not from argv.
        expect(payload.keyUserChanges).toBeUndefined();
        expect(typeof payload.id).toBe('string');

        const stagedPath = join(tmpdir(), `${payload.id}.txt`);
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            stagedPath,
            JSON.stringify({ keyUserChanges: [{ content: { foo: 'bar' } }] }),
            'utf8'
        );
        // The staged file is cleaned up after generation.
        expect(mockRmSync).toHaveBeenCalledWith(stagedPath, { force: true });
    });

    test('proceeds with generation and stages nothing when import requested but no changes returned', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([]);

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        expect(result.status).toBe('Success');
        expect(mockRunCmdArgs).toHaveBeenCalledTimes(1);
        // No changes → nothing staged, no correlation id, nothing to clean up.
        const payload = JSON.parse((mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1][3]);
        expect(payload.keyUserChanges).toBeUndefined();
        expect(payload.id).toBeUndefined();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(mockRmSync).not.toHaveBeenCalled();
    });

    test('cleans up the staged temp file even when generation fails', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([{ content: { foo: 'bar' } }]);
        mockRunCmdArgs.mockRejectedValue(new Error('boom'));

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        expect(result.status).toEqual('Error');
        const stagedPath = (mockWriteFileSync.mock.calls[0] as [string])[0];
        expect(mockRmSync).toHaveBeenCalledWith(stagedPath, { force: true });
    });

    test('does not mask a successful result when temp file cleanup throws', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([{ content: { foo: 'bar' } }]);
        mockRmSync.mockImplementation(() => {
            throw new Error('EPERM');
        });

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        expect(result.status).toBe('Success');
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            expect.stringContaining('Failed to clean up key user changes temp file')
        );
    });

    test('returns Error and does not generate when key user changes fetch hangs (timeout)', async () => {
        // Never resolves — the tool must time out rather than hang forever.
        mockFetchKeyUserChanges.mockImplementation(() => new Promise(() => {}));

        jest.useFakeTimers();
        const promise = generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);
        await jest.advanceTimersByTimeAsync(60_000);
        const result = await promise;
        jest.useRealTimers();

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('timed out');
        expect(mockRunCmdArgs).not.toHaveBeenCalled();
    });

    test('returns Error when the generator command fails', async () => {
        mockRunCmdArgs.mockRejectedValue(new Error('boom'));

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app'
        } as any);

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('boom');
    });

    test('returns Error when targetFolder is not an absolute path', async () => {
        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app',
            targetFolder: 'relative/path'
        } as any);

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('targetFolder must be an absolute path');
        expect(result.message).toContain('relative/path');
        expect(mockRunCmdArgs).not.toHaveBeenCalled();
    });

    test('spawns yo directly when yo is available on PATH', async () => {
        // Override execFileSync to simulate yo being available.
        const { execFileSync: mockExecFileSync } = jest.mocked(await import('node:child_process'));
        (mockExecFileSync as jest.MockedFunction<any>).mockImplementationOnce(() => undefined);

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app'
        } as any);

        expect(result.status).toEqual('Success');
        const [cmd, args] = mockRunCmdArgs.mock.calls[0] as [string, string[]];
        expect(cmd).toEqual('yo');
        expect(args[0]).toEqual('@sap-ux/adp');
        expect(args[args.length - 1]).toEqual('--force');
    });

    test('logs stderr output when generator writes to stderr', async () => {
        mockRunCmdArgs.mockResolvedValue({ stdout: '', stderr: 'some warning from yo' });

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            targetEnvironment: 'ABAP',
            application: 'app.id',
            appPath: '/tmp/app'
        } as any);

        expect(result.status).toEqual('Success');
        expect(mockLoggerWarn).toHaveBeenCalledWith('some warning from yo');
    });

    describe('project type resolution', () => {
        /**
         * Reads the JSON payload passed to the generator from the first runCmdArgs call.
         *
         * @returns The parsed generator payload.
         */
        function generatorPayload(): Record<string, unknown> {
            const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
            return JSON.parse(args[3]);
        }

        test('forces cloudReady on a CloudReady-only system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('cloudReady');
            expect(mockLoadApps).not.toHaveBeenCalled();
        });

        test('rejects onPremise request on a CloudReady-only system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'onPremise'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('only Cloud Ready');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects a CloudReady-only system under internal usage', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('internal features are enabled');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('forces onPremise on an on-premise-only system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('onPremise');
        });

        test('rejects cloudReady request on an on-premise-only system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('only Classic');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns InputRequired when a mixed system has a released cloud app and no type chosen', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: 'released' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.message).toContain('BOTH Cloud Ready and Classic');
            expect(result.message).toContain('"Cloud Ready" or "Classic"');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('forwards an explicit choice on a mixed system with a released cloud app', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: 'released' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('cloudReady');
        });

        test('forces onPremise for a classic app on a mixed system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: '' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('onPremise');
        });

        test('rejects cloudReady request for a classic app on a mixed system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: '' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('classic application');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('defaults to onPremise when the app is not found on a mixed system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'other.app', cloudDevAdaptationStatus: 'released' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('onPremise');
        });

        test('honors an explicit request when the app is not found on a mixed system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('cloudReady');
        });

        test('forces onPremise on a mixed system under internal usage, ignoring released status', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: 'released' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('onPremise');
            // Internal usage forces on-premise without an app lookup.
            expect(mockLoadApps).not.toHaveBeenCalled();
        });

        test('rejects a cloudReady request on a mixed system under internal usage', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: 'released' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('internal features enabled');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });
    });

    describe('target resolution', () => {
        test('routes to the CF flow for targetEnvironment "CF"', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockLoadCfConfig).toHaveBeenCalled();
            expect(mockRunCmdArgs).toHaveBeenCalledTimes(1);
        });

        test('routes to the ABAP flow for targetEnvironment "ABAP" with a system', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                system: 'UYZ/200',
                targetEnvironment: 'ABAP'
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
        });

        test('returns Error for targetEnvironment "ABAP" without a system', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'ABAP'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('system is required');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns InputRequired when targetEnvironment is missing and no system is given', async () => {
            const result = await generateAdaptationProject({ application: 'app.id', appPath: '/tmp/app' } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.message).toContain("'ABAP' or 'CF'");
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
        });

        test('returns InputRequired when targetEnvironment is missing even if a system is given', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                system: 'UYZ/200'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns InputRequired when targetEnvironment is missing even if a CF param is given', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                serviceInstanceName: 'svc-x'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
        });
    });

    describe('CF flow', () => {
        /**
         * Reads the JSON payload passed to the generator from the first runCmdArgs call.
         *
         * @returns The parsed generator payload.
         */
        function cfPayload(): Record<string, unknown> {
            const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
            return JSON.parse(args[3]);
        }

        test('returns Error when application is missing', async () => {
            const result = await generateAdaptationProject({ appPath: '/tmp/app' } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('application is required');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns Error when the CF CLI is not installed', async () => {
            mockIsCfInstalled.mockResolvedValue(false);

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('not installed');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns Error with the interpolated login endpoint when not logged in', async () => {
            mockIsLoggedInCf.mockResolvedValue(false);

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('cf login -a https://api.cf.eu10.hana.ondemand.com --sso');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('falls back to a generic endpoint placeholder when the CF url is unknown', async () => {
            mockLoadCfConfig.mockReturnValue({});
            mockIsLoggedInCf.mockResolvedValue(false);

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('cf login -a <API endpoint> --sso');
        });

        test('returns Error when no service instance exposes the application', async () => {
            mockFindServiceInstancesForApp.mockResolvedValue([]);

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('app.id');
            expect(result.message).toContain('my-space');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('generates with the single matching service instance', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockFindServiceInstancesForApp).toHaveBeenCalledTimes(1);
            const payload = cfPayload();
            expect(payload.targetEnv).toEqual('CF');
            expect(payload.serviceInstanceName).toEqual('svc-1');
            expect(payload.application).toEqual('app.id');
            expect(payload.mtaMode).toEqual('existing');
        });

        test('returns InputRequired listing instances when several match', async () => {
            mockFindServiceInstancesForApp.mockResolvedValue([{ name: 'svc-a' }, { name: 'svc-b' }]);

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.message).toContain('svc-a');
            expect(result.message).toContain('svc-b');
            expect(result.message).toContain('serviceInstanceName');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('skips discovery when serviceInstanceName is provided', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                serviceInstanceName: 'svc-x'
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
            expect(cfPayload().serviceInstanceName).toEqual('svc-x');
        });

        test('returns Error when mtaMode "new" is given without mtaId', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                mtaMode: 'new'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('mtaId');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns the MTA sub-folder as projectPath for a new MTA', async () => {
            const cfTarget = join(tmpdir(), 'cf-target');
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                targetFolder: cfTarget,
                mtaMode: 'new',
                mtaId: 'my.mta'
            } as any);

            expect(result.status).toEqual('Success');
            expect(result.projectPath).toEqual(join(cfTarget, 'my.mta'));
            expect(cfPayload().mtaId).toEqual('my.mta');
        });

        test('returns the target folder as projectPath for an existing MTA', async () => {
            const cfTarget = join(tmpdir(), 'cf-target');
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                targetFolder: cfTarget
            } as any);

            expect(result.status).toEqual('Success');
            expect(result.projectPath).toEqual(cfTarget);
        });

        test('maps the friendly approuter value to the generator value', async () => {
            await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                approuter: 'managed'
            } as any);

            expect(cfPayload().approuter).toEqual('Managed HTML5 Application Runtime');
        });

        test('omits approuter from the payload when not provided', async () => {
            await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(cfPayload()).not.toHaveProperty('approuter');
        });

        test('includes optional fields only when provided', async () => {
            await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                namespace: 'cust.ns',
                applicationTitle: 'My Title',
                projectName: 'my.project',
                businessSolutionName: 'solution-abc'
            } as any);

            const payload = cfPayload();
            expect(payload.namespace).toEqual('cust.ns');
            expect(payload.applicationTitle).toEqual('My Title');
            expect(payload.projectName).toEqual('my.project');
            expect(payload.businessSolutionName).toEqual('solution-abc');
        });

        test('returns Error when the generator fails', async () => {
            mockRunCmdArgs.mockRejectedValue(new Error('generator exploded'));

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('generator exploded');
        });

        test('ignores importKeyUserChanges for CF and proceeds', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                importKeyUserChanges: true
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockFetchKeyUserChanges).not.toHaveBeenCalled();
            expect(mockLoggerInfo).toHaveBeenCalledWith(
                'importKeyUserChanges is not supported for Cloud Foundry adaptation projects; ignoring it.'
            );
        });

        test('does not touch CF logic when a system is provided (ABAP branch)', async () => {
            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
            expect(mockIsCfInstalled).not.toHaveBeenCalled();
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
        });
    });
});
