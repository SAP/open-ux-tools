import { spawn } from 'child_process';

/**
 *
 */
export class CommandRunner {
    /**
     * Run a command with arguments.
     *
     * @param {string} cmd to execute
     * @param {string[]} args to pass to the command
     * @returns {*}  {(Promise<any | void>)}
     * @memberof CommandRunner
     */
    run(cmd: string, args: string[] = []): Promise<string | void> {
        return new Promise((resolve, reject) => {
            const stack: any = [];
            const spawnOpts = process.platform === 'win32' ? { shell: true } : {};

            const spawnedCmd = spawn(cmd, args, spawnOpts);
            spawnedCmd.stdout.setEncoding('utf8');
            let response: string;
            spawnedCmd.stdout.on('data', (data: Buffer) => {
                response = data.toString();
            });
            spawnedCmd.stderr.on('data', (data) => {
                stack.push(data.toString());
            });
            spawnedCmd.on('error', (error) => {
                reject(`Command failed with error: ${error.message}`);
            });
            spawnedCmd.on('close', (errorCode) => {
                if (errorCode !== 0) {
                    reject(`Command failed, \`${cmd} ${args.join(' ')}\`, ${stack.join(', ')}`);
                }
                resolve(response);
            });
        });
    }
}
