import { jest } from '@jest/globals';

const mockRunCmdArgs = jest.fn<any>();
const mockFetchKeyUserChanges = jest.fn<any>();
const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockLoggerError = jest.fn<any>();

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

jest.unstable_mockModule('../../../src/tools/generate-adaptation-project/key-user-changes.js', () => ({
    fetchKeyUserChanges: mockFetchKeyUserChanges
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
            username: 'user',
            password: 'pass',
            projectName: 'custom.variant'
        } as any);

        const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
        const payload = JSON.parse(args[3]);
        expect(payload).toMatchObject({
            namespace: 'my.ns',
            client: '200',
            username: 'user',
            password: 'pass',
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

    test('warns and omits payload when import requested but no changes returned', async () => {
        mockFetchKeyUserChanges.mockResolvedValue([]);

        await generateAdaptationProject({
            system: 'UYZ/200',
            application: 'app.id',
            appPath: '/tmp/app',
            importKeyUserChanges: true
        } as any);

        const args = (mockRunCmdArgs.mock.calls[0] as [string, string[], any])[1];
        const payload = JSON.parse(args[3]);
        expect(payload.keyUserChanges).toBeUndefined();
        expect(mockLoggerWarn).toHaveBeenCalled();
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
});
