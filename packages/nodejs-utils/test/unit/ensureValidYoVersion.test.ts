import { jest } from '@jest/globals';

const mockIsAppStudio = jest.fn() as jest.Mock;

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio
}));

const { CommandRunner } = await import('../../src/commandRunner.js');
const { ensureValidYoVersion, initI18nNodejsUtils } = await import('../../src/index.js');

describe('ensureValidYoVersion', () => {
    const yoCmd = process.platform === 'win32' ? 'yo.cmd' : 'yo';
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
        runSpy.mockResolvedValueOnce('7.0.1');

        const result = await ensureValidYoVersion();

        expect(result).toEqual({ error: undefined });
        expect(runSpy).toHaveBeenCalledWith(yoCmd, ['--version']);
    });

    it('returns no error when yo --version returns empty output', async () => {
        runSpy.mockResolvedValueOnce('');

        const result = await ensureValidYoVersion();

        expect(result).toEqual({ error: undefined });
        expect(runSpy).toHaveBeenCalledWith(yoCmd, ['--version']);
    });

    it('returns an unsupported version error when installed yo version is not in 4.x || 5.x || 7.x', async () => {
        runSpy.mockResolvedValueOnce('6.0.0');

        const result = await ensureValidYoVersion();

        expect(result.error).toBeDefined();
        expect(result.error).toContain('6.0.0');
        expect(result.error).toContain('7.0.1');
        expect(result.error).toContain('not supported');
    });

    it('returns a yo --version execution error when the command throws', async () => {
        runSpy.mockRejectedValueOnce(new Error('command not found'));

        const result = await ensureValidYoVersion();

        expect(result.error).toBeDefined();
        expect(result.error).toContain('command not found');
        expect(result.error).toContain(`${yoCmd} --version`);
        expect(result.error).toContain('7.0.1');
    });
});
