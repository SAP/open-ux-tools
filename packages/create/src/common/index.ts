import { spawnSync } from 'child_process';
export { promptYUIQuestions } from './prompts';

/**
 * Run npm install command.
 *
 * @param basePath - path to application root
 * @param [installArgs] - optional string array of arguments
 */
export function runNpmInstallCommand(basePath: string, installArgs: string[] = []): void {
    const npmCommand = process.platform.startsWith('win') ? 'npm.cmd' : 'npm';
    const args = ['install', ...installArgs];
    const result = spawnSync(npmCommand, args, {
        cwd: basePath,
        stdio: [0,1,2],
        shell: true
    });
    if (result.error) {
        console.error(`Error running npm install: ${result.error.message}, BasePath: ${basePath}, Args: ${args}`);
    } else if (result.status !== 0) {
        console.log(`npm process exited with code ${result.status}`);
    } else {
        console.log(`Package installed successfully in ${basePath}`);
    }
}
