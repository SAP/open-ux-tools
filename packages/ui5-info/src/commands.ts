import { spawn } from 'child_process';

/**
 * Executes an npm command to extract the supported npm versions from the npm registry.
 *
 * @returns ui5 versions
 */
export function executeNpmUI5VersionsCmd(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const cmd = isWindows ? 'npm.cmd' : 'npm';
        const args = ['show', '@sapui5/distribution-metadata', 'versions', '--no-color'];
        const stack: any = [];
        const spawnOptions = isWindows ? { shell: true } : {};
        const spawnedCmd = spawn(cmd, args, spawnOptions);
        spawnedCmd.stdout.setEncoding('utf8');
        let response: string;

        spawnedCmd.stdout.on('data', (data: Buffer) => {
            response = data.toString();
        });
        spawnedCmd.stderr.on('data', (data) => {
            stack.push(data.toString());
        });
        spawnedCmd.on('error', (error) => {
            return reject(new Error(`Command failed with error: ${error.message}`));
        });
        spawnedCmd.on('close', (errorCode) => {
            if (errorCode !== 0) {
                return reject(new Error(`Command failed, \`${cmd} ${args.join(' ')}\`, ${stack.join(', ')}`));
            }
            return resolve(
                response
                    .replace(/[\r?\n|[\] ']/g, '') // Remove all chars, new lines and empty space
                    .trim()
                    .split(',')
            );
        });
    });
}
