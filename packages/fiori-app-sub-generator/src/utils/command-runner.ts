import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { t } from './i18n';
import { spawn } from 'child_process';
import type { SpawnOptionsWithoutStdio } from 'child_process';

/**
 *
 */
export class CommandRunner {
    private readonly log: ILogWrapper;

    /**
     *
     * @param log
     */
    constructor(log: ILogWrapper) {
        this.log = log;
    }

    /**
     *
     * @param prefix
     * @param {...any} args
     */
    formatLog(prefix?: string, ...args: string[]): void {
        const out = args
            .map((a) => a.toString().trim())
            .join(' ')
            .trim();
        this.log?.info(prefix ? prefix + out : out);
    }

    /**
     * Runs a command.
     *
     * @param cmd
     * @param args
     * @param opts
     * @param enableLog
     * @returns
     */
    run(
        cmd: string,
        args: string[] = [],
        opts: SpawnOptionsWithoutStdio = {},
        enableLog = false
    ): Promise<string | void> {
        return new Promise((resolve, reject) => {
            const optsLocal = { ...opts };
            const stack: string[] = [];
            const command = `\`${cmd} ${args.join(' ')}\``;
            if (process.platform === 'win32') {
                optsLocal.shell = true;
            }

            const spawnedCmd = spawn(cmd, args, optsLocal);
            let response: string;
            if (enableLog) {
                this.formatLog('Running: ', command);
            }
            spawnedCmd.stdout.on('data', (data) => {
                if (enableLog) {
                    this.formatLog(undefined, data);
                }
                stack.push(data.toString());
                response = data.toString();
            });
            spawnedCmd.stderr.on('data', (data) => {
                if (enableLog) {
                    this.formatLog(undefined, data);
                }
                stack.push(data.toString());
            });
            spawnedCmd.on('error', (error) => {
                reject(new Error(`${t('error.commandFailed')}: ${error.message}`));
            });
            spawnedCmd.on('close', (errorCode: number, signal: string) => {
                if (signal) {
                    const signalCode = -1;
                    if (enableLog) {
                        this.formatLog(t('logMessages.commandFailedWithError', { command, signalCode }));
                    }
                    return reject(
                        new Error(
                            t('logMessages.commandErrorCodeWithStack', { command, signalCode, stack: stack.join(', ') })
                        )
                    );
                }
                if (errorCode !== 0) {
                    if (enableLog) {
                        this.formatLog(t('logMessages.commandFailedWithError', { command, errorCode }));
                    }
                    return reject(
                        new Error(
                            t('logMessages.commandErrorCodeWithStack', { command, errorCode, stack: stack.join(', ') })
                        )
                    );
                }
                resolve(response);
            });
        });
    }
}
