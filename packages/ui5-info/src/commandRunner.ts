import { spawn } from 'child_process';

/**
 *
 */
export class CommandRunner {
    /**
     * Runs the specified command in a child process.
     *
     * @param cmd - path to the executable to run
     * @param args - args
     * @returns promise resolved with stderr, stderr or rejected with error text
     */
    run(cmd: string, args: string[] = []): Promise<any | void> {
        return new Promise((resolve, reject) => {
            const stack: any = [];
            const spawnedCmd = spawn(cmd, args, {});
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
