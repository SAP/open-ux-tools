import { spawn } from 'child_process';

/**
 * npm command is platform depending: Winows 'npm.cmd', Mac 'npm'
 */
export const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';

/**
 * Platform specific config for spawn to execute commands
 */
const spawnOptions = /^win/.test(process.platform) ? { windowsVerbatimArguments: true, shell: true } : {};

/**
 * Execute a command with arguments.
 *
 * @param command - command
 * @param commandArgs - command arguments, like --global
 * @param [onStdout] - optional handler for new stdout output data
 * @param [onStderr] - optional handler for new stderr output data
 * @returns output
 */
export const spawnCommand = (
    command: string,
    commandArgs: string[],
    onStdout?: (out: string) => void,
    onStderr?: (error: string) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        let output = '';
        const spawnProcess = spawn(command, commandArgs, spawnOptions);
        spawnProcess.stdout.on('data', (data) => {
            const newData = data.toString();
            if (onStdout) {
                onStdout(newData);
            } else {
                output += newData;
            }
        });
        spawnProcess.stderr.on('data', (data) => {
            const newData = data.toString();
            if (onStderr) {
                onStderr(newData);
            } else {
                output += newData;
            }
        });
        spawnProcess.on('exit', () => {
            resolve(output);
        });
        spawnProcess.on('error', (error) => {
            reject(error);
        });
    });
};
