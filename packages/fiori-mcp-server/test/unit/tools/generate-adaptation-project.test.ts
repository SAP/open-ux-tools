import { jest } from '@jest/globals';

const mockRunCmd = jest.fn<() => Promise<{ stdout: string; stderr: string }>>();
const mockExistsSync = jest.fn<(path: string) => boolean>();
const mockMkdir = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils/index.js', () => ({
    ...actualUtils,
    runCmd: mockRunCmd
}));

const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: {
        ...actualFs,
        existsSync: mockExistsSync,
        promises: { ...(actualFs.promises ?? {}), mkdir: mockMkdir }
    },
    existsSync: mockExistsSync,
    promises: { ...(actualFs.promises ?? {}), mkdir: mockMkdir }
}));

const { generateAdaptationProject } = await import('../../../src/tools/generate-adaptation-project.js');
const { GENERATE_ADAPTATION_PROJECT_ID } = await import('../../../src/constant.js');

describe('generateAdaptationProject', () => {
    const baseParams = {
        system: 'MY_SYSTEM',
        application: 'sap.ui.demoapps.rta.fe',
        appPath: '/workspace/projects',
        targetFolder: '/workspace/projects',
        username: 'admin',
        password: 's3cr3t'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(false);
        mockRunCmd.mockResolvedValue({ stdout: 'Done', stderr: '' });
    });

    test('returns Error when system is missing', async () => {
        const result = await generateAdaptationProject({ ...baseParams, system: '' });
        expect(result.status).toBe('Error');
        expect(result.message).toContain('Missing required parameters');
        expect(result.functionalityId).toBe(GENERATE_ADAPTATION_PROJECT_ID);
    });

    test('returns Error when application is missing', async () => {
        const result = await generateAdaptationProject({ ...baseParams, application: '' });
        expect(result.status).toBe('Error');
        expect(result.functionalityId).toBe(GENERATE_ADAPTATION_PROJECT_ID);
    });

    test('strips password from parameters on validation error', async () => {
        const result = await generateAdaptationProject({ ...baseParams, system: '' });
        expect(result.parameters).not.toHaveProperty('password');
        expect((result.parameters as Record<string, unknown>).username).toBe('admin');
    });

    test('returns Success when runCmd succeeds', async () => {
        const result = await generateAdaptationProject(baseParams);
        expect(result.status).toBe('Success');
        expect(result.functionalityId).toBe(GENERATE_ADAPTATION_PROJECT_ID);
    });

    test('appPath on success envelope points to generated project folder', async () => {
        const result = await generateAdaptationProject(baseParams);
        expect(result.appPath).toContain('app.variant');
    });

    test('message on success contains project path', async () => {
        const result = await generateAdaptationProject(baseParams);
        expect(result.message).toContain('app.variant');
        expect(result.message).toContain('generated successfully');
    });

    test('strips password from parameters on success', async () => {
        const result = await generateAdaptationProject(baseParams);
        expect(result.parameters).not.toHaveProperty('password');
    });

    test('invokes yo command', async () => {
        await generateAdaptationProject(baseParams);
        const [command] = mockRunCmd.mock.calls[0] as [string, unknown];
        expect(command).toContain('yo@4');
        expect(command).toContain('@sap-ux/adp');
    });

    test('uses explicitly supplied projectName', async () => {
        const result = await generateAdaptationProject({ ...baseParams, projectName: 'my.custom.variant' });
        expect(result.appPath).toContain('my.custom.variant');
    });

    test('falls back to appPath when targetFolder is not provided', async () => {
        const { targetFolder: _tf, ...params } = baseParams;
        const result = await generateAdaptationProject({ ...params, appPath: '/fallback/dir' });
        expect(result.appPath).toContain('/fallback/dir');
    });

    test('returns Error when runCmd throws', async () => {
        mockRunCmd.mockRejectedValue(new Error('Generator crashed'));
        const result = await generateAdaptationProject(baseParams);
        expect(result.status).toBe('Error');
        expect(result.message).toContain('Generator crashed');
    });

    test('strips password from parameters on runCmd error', async () => {
        mockRunCmd.mockRejectedValue(new Error('crash'));
        const result = await generateAdaptationProject(baseParams);
        expect(result.parameters).not.toHaveProperty('password');
    });

    test('preserves original appPath on runCmd error', async () => {
        mockRunCmd.mockRejectedValue(new Error('crash'));
        const result = await generateAdaptationProject(baseParams);
        expect(result.appPath).toBe(baseParams.appPath);
    });
});

describe('getDefaultProjectName (via generateAdaptationProject)', () => {
    const baseParams = {
        system: 'MY_SYSTEM',
        application: 'sap.ui.demoapps',
        appPath: '/workspace',
        targetFolder: '/workspace'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRunCmd.mockResolvedValue({ stdout: '', stderr: '' });
    });

    test('returns "app.variant" when directory does not exist', async () => {
        mockExistsSync.mockReturnValue(false);
        const result = await generateAdaptationProject(baseParams);
        expect(result.appPath).toMatch(/app\.variant$/);
    });

    test('returns "app.variant1" when "app.variant" already exists', async () => {
        mockExistsSync.mockImplementation((p: string) => p.endsWith('app.variant'));
        const result = await generateAdaptationProject(baseParams);
        expect(result.appPath).toMatch(/app\.variant1$/);
    });

    test('returns "app.variant2" when "app.variant" and "app.variant1" already exist', async () => {
        mockExistsSync.mockImplementation((p: string) => p.endsWith('app.variant') || p.endsWith('app.variant1'));
        const result = await generateAdaptationProject(baseParams);
        expect(result.appPath).toMatch(/app\.variant2$/);
    });
});
