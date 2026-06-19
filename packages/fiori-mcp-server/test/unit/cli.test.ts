import { jest } from '@jest/globals';
import { PACKAGE_VERSION } from '../../src/package-info.js';
import { handleCliInfoFlags } from '../../src/cli.js';

function createOutput() {
    return {
        stdout: jest.fn(),
        stderr: jest.fn()
    };
}

describe('CLI metadata flags', () => {
    let originalExitCode: typeof process.exitCode;

    beforeEach(() => {
        originalExitCode = process.exitCode;
        process.exitCode = undefined;
    });

    afterEach(() => {
        process.exitCode = originalExitCode;
    });

    it.each(['--help', '-h'])('prints help for %s and skips server startup', (flag) => {
        const output = createOutput();

        const handled = handleCliInfoFlags([flag], output);

        expect(handled).toBe(true);
        expect(output.stdout).toHaveBeenCalledWith(expect.stringContaining('Usage: fiori-mcp'));
        expect(output.stdout).toHaveBeenCalledWith(expect.stringContaining('SAP Fiori'));
        expect(output.stderr).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it.each(['--version', '-v'])('prints version for %s and skips server startup', (flag) => {
        const output = createOutput();

        const handled = handleCliInfoFlags([flag], output);

        expect(handled).toBe(true);
        expect(output.stdout).toHaveBeenCalledWith(PACKAGE_VERSION);
        expect(output.stderr).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it('rejects unknown top-level options before server startup', () => {
        const output = createOutput();

        const handled = handleCliInfoFlags(['--definitely-not-a-real-flag'], output);

        expect(handled).toBe(true);
        expect(output.stderr).toHaveBeenCalledWith('Unknown option: --definitely-not-a-real-flag');
        expect(output.stdout).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(1);
    });

    it('does not handle normal server startup', () => {
        const output = createOutput();

        const handled = handleCliInfoFlags([], output);

        expect(handled).toBe(false);
        expect(output.stdout).not.toHaveBeenCalled();
        expect(output.stderr).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it('keeps log-level as a server startup option', () => {
        const output = createOutput();

        const handled = handleCliInfoFlags(['--log-level=debug'], output);

        expect(handled).toBe(false);
        expect(output.stdout).not.toHaveBeenCalled();
        expect(output.stderr).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });
});

describe('CLI entrypoint', () => {
    const originalArgv = process.argv;
    let originalExitCode: typeof process.exitCode;
    let stdoutWrite: jest.SpiedFunction<typeof process.stdout.write>;
    let stderrWrite: jest.SpiedFunction<typeof process.stderr.write>;

    async function importEntrypoint(args: string[]) {
        jest.resetModules();
        process.argv = ['node', 'fiori-mcp', ...args];

        const run = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
        const FioriFunctionalityServer = jest.fn().mockImplementation(() => ({
            run
        }));

        jest.unstable_mockModule('../../src/server', () => ({
            FioriFunctionalityServer
        }));

        await import('../../src/index.js');
        return { FioriFunctionalityServer, run };
    }

    beforeEach(() => {
        originalExitCode = process.exitCode;
        process.exitCode = undefined;
        stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        process.argv = originalArgv;
        process.exitCode = originalExitCode;
        jest.restoreAllMocks();
        jest.resetModules();
    });

    it.each(['--help', '-h'])('skips server startup for %s', async (flag) => {
        const { FioriFunctionalityServer, run } = await importEntrypoint([flag]);

        expect(FioriFunctionalityServer).not.toHaveBeenCalled();
        expect(run).not.toHaveBeenCalled();
        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('Usage: fiori-mcp'));
        expect(stderrWrite).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it.each(['--version', '-v'])('skips server startup for %s', async (flag) => {
        const { FioriFunctionalityServer, run } = await importEntrypoint([flag]);

        expect(FioriFunctionalityServer).not.toHaveBeenCalled();
        expect(run).not.toHaveBeenCalled();
        expect(stdoutWrite).toHaveBeenCalledWith(`${PACKAGE_VERSION}\n`);
        expect(stderrWrite).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });

    it('skips server startup for unknown top-level options', async () => {
        const { FioriFunctionalityServer, run } = await importEntrypoint(['--definitely-not-a-real-flag']);

        expect(FioriFunctionalityServer).not.toHaveBeenCalled();
        expect(run).not.toHaveBeenCalled();
        expect(stderrWrite).toHaveBeenCalledWith('Unknown option: --definitely-not-a-real-flag\n');
        expect(stdoutWrite).not.toHaveBeenCalled();
        expect(process.exitCode).toBe(1);
    });

    it('starts the server for log-level options', async () => {
        const { FioriFunctionalityServer, run } = await importEntrypoint(['--log-level=debug']);

        expect(FioriFunctionalityServer).toHaveBeenCalledTimes(1);
        expect(run).toHaveBeenCalledTimes(1);
        expect(stdoutWrite).not.toHaveBeenCalled();
        expect(stderrWrite).not.toHaveBeenCalled();
        expect(process.exitCode).toBeUndefined();
    });
});
