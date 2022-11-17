import { spawn } from 'child_process';
import os from 'os';
/**
 * npm command is platform depending: Winows 'npm.cmd', Mac 'npm'
 */
export const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';

/**
 * Platform specific config for spawn to execute commands
 */
const spawnOptions = /^win/.test(process.platform)
    ? { windowsVerbatimArguments: true, shell: true, cwd: os.homedir() }
    : { cwd: os.homedir() };

/**
 * Execute a command with arguments.
 *
 * @param command - command
 * @param commandArgs - command arguments, like --global
 * @returns output
 */
export function spawnCommand(command: string, commandArgs: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = '';
        const spawnProcess = spawn(command, commandArgs, spawnOptions);
        spawnProcess.stdout.on('data', (data) => {
            const newData = data.toString();
            output += newData;
        });
        spawnProcess.stderr.on('data', (data) => {
            const newData = data.toString();
            output += newData;
        });
        spawnProcess.on('exit', () => {
            resolve(output);
        });
        spawnProcess.on('error', (error) => {
            reject(error);
        });
    });
}
