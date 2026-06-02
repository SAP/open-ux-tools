import { jest } from '@jest/globals';

const mockIsAppStudio = jest.fn();

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const { CommandRunner } = await import('../../src/commandRunner.js');
const { ensureValidYoVersion, initI18nNodejsUtils } = await import('../../src/index.js');

describe('ensureValidYoVersion', () => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    let runSpy: jest.SpiedFunction<typeof CommandRunner.prototype.run>;

    beforeAll(async () => {
        await initI18nNodejsUtils();
    });

    beforeEach(() => {
        mockIsAppStudio.mockReturnValue(false);
        runSpy = jest.spyOn(CommandRunner.prototype, 'run');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns no error when running on App Studio (skips check)', async () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = await ensureValidYoVersion();

        expect(result).toEqual({});
        expect(runSpy).not.toHaveBeenCalled();
    });

    it('returns no error when installed yo version is supported', async () => {
        runSpy.mockResolvedValueOnce(JSON.stringify({ dependencies: { yo: { version: '7.0.1' } } }));

        const result = await ensureValidYoVersion();

        expect(result).toEqual({ error: undefined });
        expect(runSpy).toHaveBeenCalledWith(npmCmd, ['list', '-g', 'yo', '--json']);
    });

    it('returns no error when npm list returns empty output', async () => {
        runSpy.mockResolvedValueOnce('');

        const result = await ensureValidYoVersion();

        expect(result).toEqual({ error: undefined });
    });

    it('returns no error when yo is not in the global dependencies', async () => {
        runSpy.mockResolvedValueOnce(JSON.stringify({ dependencies: {} }));

        const result = await ensureValidYoVersion();

        expect(result).toEqual({ error: undefined });
    });

    it('returns an unsupported version error when installed yo version is not in 4.x || 5.x || 7.x', async () => {
        runSpy.mockResolvedValueOnce(JSON.stringify({ dependencies: { yo: { version: '6.0.0' } } }));

        const result = await ensureValidYoVersion();

        expect(result.error).toBeDefined();
        expect(result.error).toContain('6.0.0');
        expect(result.error).toContain('7.0.1');
        expect(result.error).toContain('not supported');
    });

    it('returns an npm list execution error when the command throws', async () => {
        runSpy.mockRejectedValueOnce(new Error('command not found'));

        const result = await ensureValidYoVersion();

        expect(result.error).toBeDefined();
        expect(result.error).toContain('command not found');
        expect(result.error).toContain(`${npmCmd} list -g yo --json`);
        expect(result.error).toContain('7.0.1');
    });
});
