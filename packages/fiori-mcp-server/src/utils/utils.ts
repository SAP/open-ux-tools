import type { PackageInfo } from '@sap-ux/nodejs-utils';

import { promisify } from 'node:util';
import { exec as execAsync } from 'node:child_process';
import crossSpawn from 'cross-spawn';
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
 * `timeout` terminates a child that hangs. `cross-spawn` is used to handle `.cmd`/`.bat` shims
 * on Windows without `shell: true`, preventing cmd.exe metacharacter injection.
 *
 * @param cmd - The executable to run (e.g. `npx`).
 * @param args - The argument vector. Each element is passed verbatim; no shell parsing occurs.
 * @param options - Optional working directory and timeout.
 * @returns A promise resolving to the collected stdout/stderr.
 * @throws {Error} If the process cannot be spawned, exits with a non-zero code, or exceeds `timeout`.
 */
export function runCmdArgs(cmd: string, args: string[], options: RunCmdArgsOptions = {}): Promise<RunCmdArgsResult> {
    const { cwd, timeout } = options;

    return new Promise<RunCmdArgsResult>((resolve, reject) => {
        const child = crossSpawn(cmd, args, { cwd });

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
                // Give the child 5 seconds to exit gracefully, then force-kill.
                const forceKillTimer = setTimeout(() => {
                    try {
                        child.kill('SIGKILL');
                    } catch {
                        // Process may have already exited
                    }
                }, 5000);
                // If the child exits before the force-kill timer fires, cancel it.
                child.once('close', () => clearTimeout(forceKillTimer));
                settle(() =>
                    reject(
                        new Error(
                            `Command '${cmd}' timed out after ${timeout}ms (${args.length} args) and was terminated.`
                        )
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
                const detail = [stderr, stdout].filter(Boolean).join('\n').trim();
                settle(() =>
                    reject(
                        new Error(`Command '${cmd}' failed with exit code ${code} (${args.length} args).\n${detail}`)
                    )
                );
            }
        });
    });
}
