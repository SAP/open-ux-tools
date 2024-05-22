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
    spawnSync(npmCommand, args, {
        cwd: basePath,
        stdio: [0, 1, 2]
    });
}
