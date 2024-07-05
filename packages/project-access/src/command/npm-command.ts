import { spawn } from 'child_process';
import type { Logger } from '@sap-ux/logger';

/**
 * Execute an npm command.
 *
 * @param commandArguments - command arguments as array, e.g. ['install', '@sap/ux-specification@1.2.3']
 * @param [options] - optional options
 * @param [options.cwd] - optional current working directory
 * @param [options.logger] - optional logger instance
 * @returns - stdout of the command
 */
export async function execNpmCommand(
    commandArguments: string[],
    options?: {
        cwd?: string;
        logger?: Logger;
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
        spawnProcess.on('exit', () => {
            if (logger) {
                const commandString = `${npmCommand} ${commandArguments.join(' ')}`;
                if (stdErr) {
                    logger.error(`Command '${commandString}' not successful, stderr: ${stdErr}`);
                }
                if (stdOut) {
                    logger.info(`Command '${commandString}' successful, stdout: ${stdOut}`);
                }
            }
            resolve(stdOut);
        });
        spawnProcess.on('error', (error) => {
            logger?.error(`Error executing npm command '${npmCommand} ${commandArguments.join(' ')}': ${error}`);
            reject(error);
        });
    });
}
