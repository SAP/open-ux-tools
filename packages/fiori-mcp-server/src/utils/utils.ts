import type { PackageInfo } from '@sap-ux/nodejs-utils';

import { promisify } from 'node:util';
import { exec as execAsync } from 'node:child_process';
import spawn, { SubprocessError } from 'nano-spawn';
import { findInstalledPackages } from '@sap-ux/nodejs-utils';

/**
 * Checks if the Fiori generator is installed.
 *
 * @param generatorVersion Required version of the generator.
 * @throws Error if the generator is not installed or does not meet the version requirement.
 */
export async function checkIfGeneratorInstalled(generatorVersion = '1.18.5'): Promise<void> {
    const generatorName = '@sap/generator-fiori';
    const packages: PackageInfo[] = await findInstalledPackages(generatorName, { minVersion: generatorVersion });
    if (packages?.length < 1) {
        throw new Error(
            `Fiori generator not found. Please install the Fiori generator >=${generatorVersion} with 'npm install -g ${generatorName}' and retry this call`
        );
    }
}

export const runCmd = promisify(execAsync);

/**
 * Result of {@link runCmdArgs}.
 */
export interface RunCmdArgsResult {
    stdout: string;
    stderr: string;
}

/**
 * Options for {@link runCmdArgs}.
 */
export interface RunCmdArgsOptions {
    /** Working directory for the child process. */
    cwd?: string;
    /** Maximum time in milliseconds to allow the child to run before it is killed. Defaults to no timeout. */
    timeout?: number;
}

/**
 * Runs a command by spawning it with an explicit argument vector instead of a shell string.
 *
 * Each argument is passed verbatim so values containing quotes, spaces, or special characters
 * are never re-parsed by a shell. Output is streamed (no `maxBuffer` limit), and an optional
 * `timeout` terminates a child that hangs. `nano-spawn` is used to handle `.cmd`/`.bat` shims
 * on Windows without `shell: true`, preventing cmd.exe metacharacter injection.
 *
 * @param cmd - The executable to run (e.g. `npx`).
 * @param args - The argument vector. Each element is passed verbatim; no shell parsing occurs.
 * @param options - Optional working directory and timeout.
 * @returns A promise resolving to the collected stdout/stderr.
 * @throws {Error} If the process cannot be spawned, exits with a non-zero code, or exceeds `timeout`.
 */
export async function runCmdArgs(cmd: string, args: string[], options: RunCmdArgsOptions = {}): Promise<RunCmdArgsResult> {
    const { cwd, timeout } = options;
    try {
        const result = await spawn(cmd, args, { cwd, timeout });
        return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
        if (error instanceof SubprocessError) {
            if (error.exitCode === undefined && error.signalName) {
                throw new Error(`Command '${cmd}' timed out after ${timeout}ms (${args.length} args) and was terminated.`);
            }
            const detail = [error.stderr, error.stdout].filter(Boolean).join('\n').trim();
            throw new Error(`Command '${cmd}' failed with exit code ${error.exitCode ?? 'unknown'} (${args.length} args).\n${detail}`);
        }
        throw error;
    }
}
