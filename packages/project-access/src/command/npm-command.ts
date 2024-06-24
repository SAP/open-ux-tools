import { spawn } from 'child_process';
import type { Logger } from '@sap-ux/logger';

/**
 * npm command is platform depending: Windows 'npm.cmd', Mac 'npm'
 */
const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';

/**
 * default spawn options, required for platform specific config to execute commands
 */
const defaultSpawnOptions = /^win/.test(process.platform) ? { windowsVerbatimArguments: true, shell: true } : {};

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
        let stdOut = '';
        let stdErr = '';
        const logger = options?.logger;
        const cwd = options?.cwd;
        const spawnOptions = typeof cwd === 'string' ? { ...defaultSpawnOptions, cwd } : defaultSpawnOptions;
        const spawnProcess = spawn(npmCommand, commandArguments, spawnOptions);
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
