import { spawn } from 'child_process';

/**
 * npm command is platform depending: Winows 'npm.cmd', Mac 'npm'
 */
const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';

/**
 * platform specific config for spawn to execute commands
 */
const spawnOptions = /^win/.test(process.platform) ? { windowsVerbatimArguments: true, shell: true } : {};

/**
 * Execute an npm command.
 *
 * @param commandArguments - command arguments, e.g. install @sap/ux-specification@1.2.3
 * @param cwd - optional current working directory
 * @returns - stdout of the command
 */
export async function execNpmCommand(commandArguments: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let stdOut = '';
        let stdErr = '';
        const options = cwd ? { ...spawnOptions, cwd } : spawnOptions;
        const spawnProcess = spawn(npmCommand, commandArguments, options);
        spawnProcess.stdout.on('data', (data) => {
            stdOut += data.toString();
        });
        spawnProcess.stderr.on('data', (data) => {
            stdErr += data.toString();
        });
        spawnProcess.on('exit', () => {
            const commandString = `${npmCommand} ${commandArguments.join(' ')}`;
            if (stdErr) {
                console.error(`Command '${commandString}' not successful, stderr:`, stdErr);
            }
            if (stdOut) {
                console.log(`Command '${commandString}' successful, stdout:`, stdOut);
            }
            resolve(stdOut);
        });
        spawnProcess.on('error', (error) => {
            reject(error);
        });
    });
}
