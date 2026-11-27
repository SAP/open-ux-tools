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
const mockGetAdpServiceInstances = jest.fn<() => Promise<unknown>>();
const mockGetBusinessServiceInfo = jest.fn<() => Promise<unknown>>();
const mockGetCfApps = jest.fn<() => Promise<unknown>>();
const mockDownloadAppContent = jest.fn<() => Promise<unknown>>();
const mockValidateSmartTemplateApplication = jest.fn<() => Promise<void>>();
const mockValidateODataEndpoints = jest.fn<() => Promise<void>>();
const mockGetManifest = jest.fn<() => Promise<unknown>>();
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

const mockGetApprouterType = jest.fn<() => (typeof AppRouterType)[keyof typeof AppRouterType]>();

const actualValidation = await import('../../../../adp-tooling/src/cf/project-validation.js');
const mockValidateProjectPath = jest.fn<typeof actualValidation.validateProjectPath>();
const mockGetDefaultProjectName = jest.fn().mockReturnValue('app.variant');

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
    getDefaultProjectName: mockGetDefaultProjectName,
    validateProjectPath: mockValidateProjectPath,
    validateMtaId: actualValidation.validateMtaId,
    validateBusinessSolutionName: actualValidation.validateBusinessSolutionName,
    getApprouterType: mockGetApprouterType,
    getModuleNames: jest.fn().mockReturnValue([]),
    hasApprouter: jest.fn().mockReturnValue(false),
    getConfiguredProvider: mockGetConfiguredProvider,
    getSupportedProject: mockGetSupportedProject,
    loadApps: mockLoadApps,
    loadCfConfig: mockLoadCfConfig,
    isCfInstalled: mockIsCfInstalled,
    isLoggedInCf: mockIsLoggedInCf,
    findServiceInstancesForApp: mockFindServiceInstancesForApp,
    getAdpServiceInstances: mockGetAdpServiceInstances,
    getBusinessServiceInfo: mockGetBusinessServiceInfo,
    getCfApps: mockGetCfApps,
    downloadAppContent: mockDownloadAppContent,
    validateSmartTemplateApplication: mockValidateSmartTemplateApplication,
    validateODataEndpoints: mockValidateODataEndpoints,
    SourceManifest: class {
        getManifest = mockGetManifest;
    },
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
const mockStatSync = jest.fn().mockReturnValue({ isDirectory: () => true });
const mockAccessSync = jest.fn();
const mockMkdirSync = jest.fn();
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
    statSync: mockStatSync,
    accessSync: mockAccessSync,
    mkdirSync: mockMkdirSync,
    realpathSync: jest.fn((path) => path),
    writeFileSync: mockWriteFileSync,
    rmSync: mockRmSync,
    promises: { ...actualFs.promises, mkdir: mockMkdir }
}));

const { generateAdaptationProject } = await import('../../../src/tools/generate-adaptation-project.js');

describe('generateAdaptationProject', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(false);
        mockValidateProjectPath.mockReturnValue(true);
        mockGetApprouterType.mockReturnValue(AppRouterType.MANAGED);
        mockGetDefaultProjectName.mockReturnValue('app.variant');
        mockRunCmdArgs.mockResolvedValue({ stdout: 'done', stderr: '' });
        // Default to an on-premise-only system so existing tests resolve to a concrete type
        // and proceed to generation without requiring an explicit projectType.
        mockGetConfiguredProvider.mockResolvedValue({});
        mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);
        mockLoadApps.mockResolvedValue([{ id: 'app.id', cloudDevAdaptationStatus: 'released' }]);
        mockGetManifest.mockResolvedValue({});
        mockStatSync.mockReturnValue({ isDirectory: () => true });
        mockAccessSync.mockImplementation(() => undefined);
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
        mockFindServiceInstancesForApp.mockResolvedValue({
            matches: [{ name: 'svc-1', guid: 'si-1' }],
            incompleteInstances: []
        });
        mockGetAdpServiceInstances.mockResolvedValue([{ name: 'svc-1', guid: 'si-1' }]);
        mockGetBusinessServiceInfo.mockResolvedValue({ serviceKeys: [{}], serviceInstance: { guid: 'si-1' } });
        mockGetCfApps.mockResolvedValue([{ appId: 'app.id', title: 'Base app' }]);
        mockDownloadAppContent.mockResolvedValue({ entries: [], manifest: {} });
        mockValidateSmartTemplateApplication.mockResolvedValue(undefined);
        mockValidateODataEndpoints.mockResolvedValue(undefined);
    });

    test('returns Error when required parameters are missing', async () => {
        const result = await generateAdaptationProject({ system: '', application: '', appPath: '/tmp/app' } as any);

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('application is required');
        expect(mockRunCmdArgs).not.toHaveBeenCalled();
    });

    test('spawns npx with JSON as a single argv element (no shell interpolation)', async () => {
        mockLoadApps.mockResolvedValue([{ id: 'manage.products.odata.lrop.local' }]);
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
            namespace: 'customer.my.ns',
            client: '200',
            projectName: 'custom.variant'
        } as any);

        const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
        const payload = JSON.parse(args[3]);
        expect(payload).toMatchObject({
            namespace: 'customer.my.ns',
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

    describe('preflight validation', () => {
        test.each([
            ['serviceInstanceName', '   '],
            ['applicationTitle', ''],
            ['namespace', ' '],
            ['projectName', ''],
            ['system', ' '],
            ['mtaId', ' '],
            ['businessSolutionName', ''],
            ['targetEnvironment', 'BTP'],
            ['mtaMode', 'reuse'],
            ['approuter', 'custom'],
            ['client', 200],
            ['importKeyUserChanges', 'true'],
            ['serviceInastanceName', 'svc-1']
        ])('rejects invalid %s without calling creation', async (field, value) => {
            const result = await generateAdaptationProject({
                targetEnvironment: 'CF',
                application: 'app.id',
                appPath: '/tmp/app',
                [field]: value
            });
            expect(result.status).toBe('Error');
            expect(result.phase).toBe('validation');
            expect(result.issues?.some((issue) => issue.field === field)).toBe(true);
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('reports independent ABAP attribute errors before connecting to the system', async () => {
            const result = await generateAdaptationProject({
                targetEnvironment: 'ABAP',
                application: 'app.id',
                system: 'UYZ/200',
                appPath: '/tmp/app',
                projectName: 'Invalid Name',
                namespace: 'Invalid namespace',
                client: '20'
            });
            expect(result.issues?.map((issue) => issue.field)).toEqual(['projectName', 'namespace', 'client']);
            expect(mockGetConfiguredProvider).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
            expect(mockMkdirSync).not.toHaveBeenCalled();
        });

        test('validates appPath even when targetFolder overrides it', async () => {
            const result = await generateAdaptationProject({
                targetEnvironment: 'ABAP',
                application: 'app.id',
                system: 'UYZ/200',
                appPath: 'relative',
                targetFolder: '/tmp/app'
            });
            expect(result.issues?.[0].field).toBe('appPath');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects a destination whose parent is a file', async () => {
            mockStatSync.mockReturnValue({ isDirectory: () => false });
            const result = await generateAdaptationProject({
                targetEnvironment: 'CF',
                application: 'app.id',
                appPath: '/tmp/app'
            });
            expect(result.issues?.[0]).toMatchObject({ field: 'appPath', code: 'invalid_path' });
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects an unwritable destination before backend discovery', async () => {
            mockAccessSync.mockImplementation(() => {
                throw new Error('EACCES');
            });
            const result = await generateAdaptationProject({
                targetEnvironment: 'CF',
                application: 'app.id',
                appPath: '/tmp/app'
            });
            expect(result.issues?.[0]).toMatchObject({ field: 'appPath', code: 'invalid_path' });
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns a structured system diagnostic without starting creation', async () => {
            mockGetConfiguredProvider.mockRejectedValue(new Error('Stored system not found'));
            const result = await generateAdaptationProject({
                targetEnvironment: 'ABAP',
                application: 'app.id',
                system: 'missing',
                appPath: '/tmp/app'
            });
            expect(result).toMatchObject({
                status: 'Error',
                phase: 'validation',
                issues: [{ field: 'system', code: 'system_unavailable', message: 'Stored system not found' }]
            });
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('checks ABAP base manifest availability before creation', async () => {
            mockGetManifest.mockRejectedValue(new Error('Manifest is unavailable'));
            const result = await generateAdaptationProject({
                targetEnvironment: 'ABAP',
                application: 'app.id',
                system: 'UYZ/200',
                appPath: '/tmp/app'
            });
            expect(result.issues?.[0]).toMatchObject({
                field: 'application',
                code: 'application_metadata_unavailable'
            });
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test.each([
            [mockGetAdpServiceInstances, 'serviceInstanceName', 'service_discovery_failed'],
            [mockGetBusinessServiceInfo, 'serviceInstanceName', 'service_credentials_unavailable'],
            [mockGetCfApps, 'application', 'application_discovery_failed'],
            [mockDownloadAppContent, 'application', 'application_metadata_unavailable'],
            [mockValidateSmartTemplateApplication, 'application', 'unsupported_application'],
            [mockValidateODataEndpoints, 'application', 'inconsistent_odata_endpoints']
        ] as const)('returns consistent CF preflight diagnostics for %s', async (operation, field, code) => {
            operation.mockRejectedValue(new Error('Backend diagnostic'));
            const result = await generateAdaptationProject({
                targetEnvironment: 'CF',
                application: 'app.id',
                serviceInstanceName: 'svc-1',
                appPath: '/tmp/app'
            });
            expect(result).toMatchObject({
                status: 'Error',
                phase: 'validation',
                issues: [{ field, code, message: 'Backend diagnostic' }]
            });
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test.each([null, { serviceKeys: [] }])(
            'rejects a service without usable credentials: %s',
            async (serviceInfo) => {
                mockGetBusinessServiceInfo.mockResolvedValue(serviceInfo);
                const result = await generateAdaptationProject({
                    targetEnvironment: 'CF',
                    application: 'app.id',
                    serviceInstanceName: 'svc-1',
                    appPath: '/tmp/app'
                });
                expect(result.issues?.[0]).toMatchObject({
                    field: 'serviceInstanceName',
                    code: 'service_credentials_unavailable'
                });
                expect(mockGetCfApps).not.toHaveBeenCalled();
                expect(mockRunCmdArgs).not.toHaveBeenCalled();
            }
        );

        test('separates creation failures from validation failures', async () => {
            mockRunCmdArgs.mockRejectedValue(new Error('Process exited with code 1'));
            const result = await generateAdaptationProject({
                targetEnvironment: 'CF',
                application: 'app.id',
                appPath: '/tmp/app'
            });
            expect(result).toMatchObject({
                status: 'Error',
                phase: 'generation',
                issues: [{ field: 'generation', code: 'generation_failed' }]
            });
            expect(mockValidateODataEndpoints).toHaveBeenCalled();
            expect(mockRunCmdArgs).toHaveBeenCalledTimes(1);
        });
    });

    describe('project type resolution', () => {
        /**
         * Reads the JSON payload passed to the generator from the first runCmdArgs call.
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
            expect(mockLoadApps).toHaveBeenCalled();
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
            expect(result.missingFields).toEqual(['projectType']);
            expect(result.choices?.projectType).toEqual([
                { value: 'cloudReady', label: 'Cloud Ready' },
                { value: 'onPremise', label: 'Classic' }
            ]);
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

        test('rejects an unknown app before choosing a default project type', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([{ id: 'other.app', cloudDevAdaptationStatus: 'released' }]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app'
            } as any);

            expect(result).toMatchObject({
                status: 'Error',
                phase: 'validation',
                issues: [{ field: 'application', code: 'application_not_found' }]
            });
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects an unknown app even when projectType is explicit', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
            mockLoadApps.mockResolvedValue([]);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
                targetEnvironment: 'ABAP',
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result).toMatchObject({
                status: 'Error',
                phase: 'validation',
                issues: [{ field: 'application', code: 'application_not_found' }]
            });
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
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
            // Internal usage still validates that the base app exists.
            expect(mockLoadApps).toHaveBeenCalledWith({}, false, SupportedProject.CLOUD_READY_AND_ON_PREM);
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

        test('returns InputRequired for targetEnvironment "ABAP" without a system', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'ABAP'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.missingFields).toEqual(['system']);
            expect(result.message).toContain('system is required');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns InputRequired when targetEnvironment is missing and no system is given', async () => {
            const result = await generateAdaptationProject({ application: 'app.id', appPath: '/tmp/app' } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.missingFields).toEqual(['targetEnvironment']);
            expect(result.choices?.targetEnvironment.map((choice) => choice.value)).toEqual(['ABAP', 'CF']);
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
        test.each([
            { targetEnvironment: 'invalid' },
            { targetEnvironment: 'CF', mtaMode: 'invalid' },
            { targetEnvironment: 'CF', approuter: 'invalid' },
            { targetEnvironment: 'CF', importKeyUserChanges: 'true' }
        ])('rejects malformed inputs before backend calls: %j', async (input) => {
            const result = await generateAdaptationProject({ application: 'app.id', appPath: '/tmp/app', ...input });

            expect(result.status).toBe('Error');
            expect(result.issues).toEqual(
                expect.arrayContaining([expect.objectContaining({ code: expect.any(String) })])
            );
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects an invalid new MTA name before discovery or generation', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF',
                mtaMode: 'new',
                mtaId: '../outside'
            });

            expect(result.status).toBe('Error');
            expect(result.issues?.[0].field).toBe('mtaId');
            expect(mockLoadCfConfig).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects a namespace that is invalid for the generator layer', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF',
                namespace: 'my.ns'
            });

            expect(result.status).toBe('Error');
            expect(result.issues?.[0].field).toBe('namespace');
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects an invalid MTA destination before service discovery', async () => {
            mockValidateProjectPath.mockReturnValue('The selected MTA belongs to another CF space.');
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            });

            expect(result.status).toBe('Error');
            expect(result.issues?.[0].field).toBe('appPath');
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns the resolved default app folder and forwards it to the generator', async () => {
            mockGetDefaultProjectName.mockReturnValue('app.variant2');
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            });

            expect(result.projectPath).toBe(join('/tmp/app', 'app.variant2'));
            expect(cfPayload().projectName).toBe('app.variant2');
        });

        test('returns the explicit adaptation app folder inside a new MTA', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF',
                mtaMode: 'new',
                mtaId: 'my-mta',
                projectName: 'my.variant'
            });

            expect(result.mtaRoot).toBe(join('/tmp/app', 'my-mta'));
            expect(result.projectPath).toBe(join('/tmp/app', 'my-mta', 'my.variant'));
        });

        test('rejects an invalid business solution name for a new managed MTA', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF',
                mtaMode: 'new',
                mtaId: 'my-mta',
                businessSolutionName: 'Invalid Name'
            });

            expect(result.status).toBe('Error');
            expect(result.issues?.[0].field).toBe('businessSolutionName');
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        /**
         * Reads the JSON payload passed to the generator from the first runCmdArgs call.
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
            mockFindServiceInstancesForApp.mockResolvedValue({ matches: [], incompleteInstances: [] });

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
            mockFindServiceInstancesForApp.mockResolvedValue({
                matches: [{ name: 'svc-a' }, { name: 'svc-b' }],
                incompleteInstances: []
            });

            const result = await generateAdaptationProject({
                application: 'app.id',
                appPath: '/tmp/app',
                targetEnvironment: 'CF'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.missingFields).toEqual(['serviceInstanceName']);
            expect(result.choices?.serviceInstanceName).toEqual([
                { value: 'svc-a', label: 'svc-a' },
                { value: 'svc-b', label: 'svc-b' }
            ]);
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test.each([0, 1])(
            'requires explicit selection after incomplete discovery with %i confirmed matches',
            async (count) => {
                mockFindServiceInstancesForApp.mockResolvedValue({
                    matches: count ? [{ name: 'svc-1', guid: 'si-1' }] : [],
                    incompleteInstances: [
                        {
                            instance: { name: 'svc-2', guid: 'si-2' },
                            code: 'service_instance_probe_failed',
                            message: 'svc-2 is unavailable'
                        }
                    ]
                });
                const result = await generateAdaptationProject({
                    application: 'app.id',
                    targetEnvironment: 'CF',
                    appPath: '/tmp/app'
                });
                expect(result.status).toBe('InputRequired');
                expect(result.missingFields).toEqual(['serviceInstanceName']);
                expect(result.choices?.serviceInstanceName.map((choice) => choice.value)).toEqual(
                    count ? ['svc-1', 'svc-2'] : ['svc-2']
                );
                expect(result.issues?.[0]).toMatchObject({
                    field: 'serviceInstanceName',
                    code: 'service_instance_probe_failed'
                });
                expect(mockRunCmdArgs).not.toHaveBeenCalled();
                expect(mockGetBusinessServiceInfo).not.toHaveBeenCalled();
            }
        );

        test('validates an explicit service instance before creating the project', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                serviceInstanceName: 'svc-1'
            } as any);

            expect(result.status).toEqual('Success');
            expect(mockFindServiceInstancesForApp).not.toHaveBeenCalled();
            expect(mockGetAdpServiceInstances).toHaveBeenCalled();
            expect(mockGetCfApps).toHaveBeenCalled();
            expect(cfPayload().serviceInstanceName).toEqual('svc-1');
        });

        test('rejects a service instance outside the selected space before creation', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                serviceInstanceName: 'unknown'
            });
            expect(result).toMatchObject({
                status: 'Error',
                phase: 'validation',
                issues: [{ field: 'serviceInstanceName', code: 'service_instance_not_found' }]
            });
            expect(mockGetBusinessServiceInfo).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('rejects a base application not exposed by the selected service', async () => {
            mockGetCfApps.mockResolvedValue([{ appId: 'other.app', title: 'Other app' }]);
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                serviceInstanceName: 'svc-1'
            });
            expect(result).toMatchObject({
                status: 'Error',
                phase: 'validation',
                issues: [{ field: 'application', code: 'application_not_found' }]
            });
            expect(mockDownloadAppContent).not.toHaveBeenCalled();
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('returns InputRequired when mtaMode "new" is given without mtaId', async () => {
            const result = await generateAdaptationProject({
                application: 'app.id',
                targetEnvironment: 'CF',
                appPath: '/tmp/app',
                mtaMode: 'new'
            } as any);

            expect(result.status).toEqual('InputRequired');
            expect(result.missingFields).toEqual(['mtaId']);
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
            expect(result.projectPath).toEqual(join(cfTarget, 'my.mta', 'app.variant'));
            expect(result.mtaRoot).toEqual(join(cfTarget, 'my.mta'));
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
            expect(result.projectPath).toEqual(join(cfTarget, 'app.variant'));
            expect(result.mtaRoot).toEqual(cfTarget);
        });

        test.each([
            ['existing', undefined, AppRouterType.MANAGED, 'Error', 1],
            ['existing', undefined, AppRouterType.STANDALONE, 'Success', 1],
            ['new', undefined, AppRouterType.STANDALONE, 'Error', 0],
            ['existing', 'managed', AppRouterType.STANDALONE, 'Error', 0],
            ['existing', 'standalone', AppRouterType.MANAGED, 'Success', 0],
            ['new', 'standalone', AppRouterType.MANAGED, 'Success', 0]
        ] as const)(
            'preserves business-solution validation for %s MTA, requested router %s and detected router %s',
            async (mtaMode, approuter, detected, status, lookups) => {
                mockGetApprouterType.mockReturnValue(detected);
                const result = await generateAdaptationProject({
                    application: 'app.id',
                    targetEnvironment: 'CF',
                    appPath: '/tmp/app',
                    mtaMode,
                    mtaId: 'my-mta',
                    approuter,
                    businessSolutionName: 'Invalid Name'
                });
                expect(result.status).toBe(status);
                expect(mockGetApprouterType).toHaveBeenCalledTimes(lookups);
                if (status === 'Error') {
                    expect(result.issues?.[0].field).toBe('businessSolutionName');
                    expect(mockRunCmdArgs).not.toHaveBeenCalled();
                } else {
                    expect(mockRunCmdArgs).toHaveBeenCalledTimes(1);
                }
            }
        );

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
                namespace: 'customer.cust.ns',
                applicationTitle: 'My Title',
                projectName: 'my.project',
                businessSolutionName: 'solution-abc'
            } as any);

            const payload = cfPayload();
            expect(payload.namespace).toEqual('customer.cust.ns');
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
