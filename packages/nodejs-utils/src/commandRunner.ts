import { spawn, type SpawnOptionsWithoutStdio } from 'child_process';
import type { Logger } from '@sap-ux/logger';

/**
 *
 */
export class CommandRunner {
    /**
     * Run a command with arguments.
     *
     * @param {string} cmd to execute
     * @param {string[]} args to pass to the command
     * @param {SpawnOptionsWithoutStdio} [opts] options to pass to the command
     * @param {Logger} [logger] optional logger to capture command output
     * @returns {*}  {(Promise<any | void>)}
     * @memberof CommandRunner
     */
    run(
        cmd: string,
        args: string[] = [],
        opts: SpawnOptionsWithoutStdio = {},
        logger?: Logger
    ): Promise<string | void> {
        if (logger) {
            logger.debug(`Running command: ${cmd} ${args.join(' ')}`);
        }
        return new Promise((resolve, reject) => {
            const stack: any = [];
            const spawnOpts = process.platform === 'win32' ? { ...opts, shell: true } : opts;

            const spawnedCmd = spawn(cmd, args, spawnOpts);
            spawnedCmd.stdout.setEncoding('utf8');
            let response: string;
            spawnedCmd.stdout.on('data', (data: Buffer) => {
                logger?.info(data.toString().replace(/[\r\n]{1,100}$/, '')); // remove trailing newline as another is added by the logger
                response = data.toString();
            });
            spawnedCmd.stderr.on('data', (data) => {
                logger?.info(data.toString().replace(/[\r\n]{1,100}$/, '')); // remove trailing newline as another is added by the logger
                stack.push(data.toString());
            });
            spawnedCmd.on('error', (error) => {
                const cmdFailedMsg = `Command failed with error: ${error.message}`;
                logger?.error(cmdFailedMsg);
                reject(cmdFailedMsg);
            });
            spawnedCmd.on('close', (errorCode) => {
                if (errorCode !== 0) {
                    const cmdFailedMsg = `Command failed, \`${cmd} ${args.join(' ')}\`, ${stack.join(', ')}`;
                    logger?.debug(cmdFailedMsg);
                    reject(cmdFailedMsg);
                }
                resolve(response);
            });
        });
    }
}
