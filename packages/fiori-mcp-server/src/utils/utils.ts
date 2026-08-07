import type { PackageInfo } from '@sap-ux/nodejs-utils';

import { promisify } from 'node:util';
import { exec as execAsync, spawn, type SpawnOptions } from 'node:child_process';
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
 * Unlike {@link runCmd} (which wraps `exec` and interpolates the command into a shell), this
 * passes each argument as a distinct argv element. That means arbitrary argument values —
 * such as a JSON payload containing quotes, spaces or apostrophes — are never re-parsed by a
 * shell and cannot corrupt the command. Output is streamed, so there is no `maxBuffer` limit,
 * and an optional `timeout` guards against a child that hangs (e.g. a generator that silently
 * dropped into an interactive prompt with no attached stdin).
 *
 * On Windows, `.cmd`/`.bat` shims (like `npx`) are not directly executable, so the command is
 * run through the shell there; each argument is still passed as a separate argv element.
 *
 * @param cmd - The executable to run (e.g. `npx`).
 * @param args - The argument vector. Each element is passed verbatim; no shell parsing occurs on non-Windows.
 * @param options - Optional working directory and timeout.
 * @returns A promise resolving to the collected stdout/stderr.
 * @throws {Error} If the process cannot be spawned, exits with a non-zero code, or exceeds `timeout`.
 */
export function runCmdArgs(cmd: string, args: string[], options: RunCmdArgsOptions = {}): Promise<RunCmdArgsResult> {
    const { cwd, timeout } = options;
    const spawnOptions: SpawnOptions = {
        cwd,
        // npx resolves to npx.cmd on Windows, which requires a shell to launch.
        shell: process.platform === 'win32'
    };

    return new Promise<RunCmdArgsResult>((resolve, reject) => {
        const child = spawn(cmd, args, spawnOptions);

        let stdout = '';
        let stderr = '';
        let settled = false;
        let timer: NodeJS.Timeout | undefined;

        const settle = (fn: () => void): void => {
            if (settled) {
                return;
            }
            settled = true;
            if (timer) {
                clearTimeout(timer);
            }
            fn();
        };

        if (timeout && timeout > 0) {
            timer = setTimeout(() => {
                child.kill('SIGTERM');
                settle(() =>
                    reject(
                        new Error(`Command '${cmd} ${args.join(' ')}' timed out after ${timeout}ms and was terminated.`)
                    )
                );
            }, timeout);
        }

        child.stdout?.setEncoding('utf8');
        child.stderr?.setEncoding('utf8');
        child.stdout?.on('data', (data: string) => {
            stdout += data;
        });
        child.stderr?.on('data', (data: string) => {
            stderr += data;
        });

        child.on('error', (error) => {
            settle(() => reject(error));
        });

        child.on('close', (code) => {
            if (code === 0) {
                settle(() => resolve({ stdout, stderr }));
            } else {
                settle(() =>
                    reject(new Error(`Command '${cmd} ${args.join(' ')}' failed with exit code ${code}. ${stderr}`))
                );
            }
        });
    });
}
