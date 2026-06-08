import { parseCliArgs } from '../../src/cli.js';

describe('parseCliArgs', () => {
    it('starts the server when no metadata flags are provided', () => {
        expect(parseCliArgs([], '1.1.2')).toEqual({
            action: 'start'
        });
    });

    it('prints help for --help', () => {
        const result = parseCliArgs(['--help'], '1.1.2');

        expect(result.action).toBe('exit');
        if (result.action !== 'exit') {
            throw new Error('Expected CLI parsing to exit');
        }
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage: fiori-mcp [options]');
        expect(result.stdout).toContain('--version');
    });

    it('prints help for -h', () => {
        const result = parseCliArgs(['-h'], '1.1.2');

        expect(result.action).toBe('exit');
        if (result.action !== 'exit') {
            throw new Error('Expected CLI parsing to exit');
        }
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage: fiori-mcp [options]');
    });

    it('prints version for --version', () => {
        const result = parseCliArgs(['--version'], '1.1.2');

        expect(result).toEqual({
            action: 'exit',
            exitCode: 0,
            stdout: '1.1.2\n'
        });
    });

    it('prints version for -v', () => {
        const result = parseCliArgs(['-v'], '1.1.2');

        expect(result).toEqual({
            action: 'exit',
            exitCode: 0,
            stdout: '1.1.2\n'
        });
    });

    it('prints a concise error for unknown flags', () => {
        const result = parseCliArgs(['--definitely-not-a-real-flag'], '1.1.2');

        expect(result.action).toBe('exit');
        if (result.action !== 'exit') {
            throw new Error('Expected CLI parsing to exit');
        }
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("Unknown option '--definitely-not-a-real-flag'");
    });
});
