import { jest } from '@jest/globals';

const mockRunCmdArgs = jest.fn<any>();
const mockFetchKeyUserChanges = jest.fn<any>();
const mockGetConfiguredProvider = jest.fn<any>();
const mockGetSupportedProject = jest.fn<any>();
const mockLoadApps = jest.fn<any>();
const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockLoggerError = jest.fn<any>();

const SupportedProject = {
    ON_PREM: 'onPremise',
    CLOUD_READY: 'cloudReady',
    CLOUD_READY_AND_ON_PREM: 'cloudReadyAndOnPrem'
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
    SupportedProject
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
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        existsSync: mockExistsSync,
        promises: { ...actualFs.promises, mkdir: mockMkdir }
    },
    existsSync: mockExistsSync,
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
    });

    test('returns Error when required parameters are missing', async () => {
        const result = await generateAdaptationProject({ system: '', application: '', appPath: '/tmp/app' } as any);

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('system and application are required');
        expect(mockRunCmdArgs).not.toHaveBeenCalled();
    });

    test('spawns npx with JSON as a single argv element (no shell interpolation)', async () => {
        const result = await generateAdaptationProject({
            system: 'UYZ/200',
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

    test('attaches key user changes when import requested and changes exist', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([{ content: { foo: 'bar' } }]);

        await generateAdaptationProject({
            system: 'UYZ/200',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
        const payload = JSON.parse(args[3]);
        expect(payload.keyUserChanges).toEqual([{ content: { foo: 'bar' } }]);
    });

    test('proceeds with generation and logs a warning when import requested but no changes returned', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([]);

        const result = await generateAdaptationProject({
            system: 'UYZ/200',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        expect(result.status).toBe('Success');
        expect(mockRunCmdArgs).toHaveBeenCalledTimes(1);
        // keyUserChanges should not be in the payload when the list is empty
        const payload = JSON.parse(mockRunCmdArgs.mock.calls[0][1][3] as string);
        expect(payload.keyUserChanges).toBeUndefined();
    });

    test('returns Error and does not generate when key user changes fetch hangs (timeout)', async () => {
        // Never resolves — the tool must time out rather than hang forever.
        mockFetchKeyUserChanges.mockImplementation(() => new Promise(() => {}));

        jest.useFakeTimers();
        const promise = generateAdaptationProject({
            system: 'UYZ/200',
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
            application: 'app.id',
            appPath: '/tmp/app'
        } as any);

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('boom');
    });

    test('returns Error when targetFolder is not an absolute path', async () => {
        const result = await generateAdaptationProject({
            system: 'UYZ/200',
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
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'onPremise'
            } as any);

            expect(result.status).toEqual('Error');
            expect(result.message).toContain('only Cloud Ready');
            expect(mockRunCmdArgs).not.toHaveBeenCalled();
        });

        test('forces onPremise on an on-premise-only system', async () => {
            mockGetSupportedProject.mockResolvedValue(SupportedProject.ON_PREM);

            const result = await generateAdaptationProject({
                system: 'UYZ/200',
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
                application: 'app.id',
                appPath: '/tmp/app',
                projectType: 'cloudReady'
            } as any);

            expect(result.status).toEqual('Success');
            expect(generatorPayload().projectType).toEqual('cloudReady');
        });
    });
});
