import { spawn } from 'node:child_process';
import type { Logger } from '@sap-ux/logger';

/**
 * Execute an npm command.
 *
 * @param commandArguments - command arguments as array, e.g. ['install', '@sap/ux-specification@1.2.3']
 * @param [options] - optional options
 * @param [options.cwd] - optional current working directory
 * @param [options.logger] - optional logger instance
 * @param [options.throwOnError] - optional flag to throw an error if the command exits with a non-zero code, default is false
 * @returns - stdout of the command
 */
export async function execNpmCommand(
    commandArguments: string[],
    options?: {
        cwd?: string;
        logger?: Logger;
        throwOnError?: boolean;
    }
): Promise<string> {
    return new Promise((resolve, reject) => {
        const isWin = process.platform.startsWith('win');
        // Command to execute npm is platform specific, 'npm.cmd' on windows, 'npm' otherwise
        const npmCommand = isWin ? 'npm.cmd' : 'npm';

        // Platform specific spawn options, 'windowsVerbatimArguments' and 'shell' true on windows
        const defaultSpawnOptions = isWin ? { windowsVerbatimArguments: true, shell: true } : {};

        const logger = options?.logger;
        const cwd = options?.cwd;
        const spawnOptions = typeof cwd === 'string' ? { ...defaultSpawnOptions, cwd } : defaultSpawnOptions;
        const spawnProcess = spawn(npmCommand, commandArguments, spawnOptions);
        let stdOut = '';
        let stdErr = '';
        spawnProcess.stdout.on('data', (data) => {
            stdOut += data.toString();
        });
        spawnProcess.stderr.on('data', (data) => {
            stdErr += data.toString();
        });
        const commandString = `${npmCommand} ${commandArguments.join(' ')}`;
        spawnProcess.on('exit', (code, signal) => {
            if (code === null) {
                logger?.warn(`Command '${commandString}' was killed by signal: ${signal}`);
            } else if (code === 0) {
                const stdMessages = [stdOut, stdErr].filter(Boolean).join('\n');
                const output = stdMessages ? `:\n${stdMessages}` : '';
                logger?.info(`Command '${commandString}' successful${output}`);
            } else if (options?.throwOnError) {
                if (stdOut) {
                    logger?.info(stdOut);
                }
                reject(new Error(`Command '${commandString}' failed with exit code ${code}. Stderr: ${stdErr}`));
                return;
            } else {
                logger?.error(`Command '${commandString}' not successful, stderr: ${stdErr}`);
            }
            resolve(stdOut);
        });
        spawnProcess.on('error', (error) => {
            logger?.error(`Error executing npm command '${commandString}': ${error}`);
            reject(error);
        });
    });
}
