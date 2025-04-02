import * as util from 'util';
import { exec } from 'child_process';

/**
 * Installs dependencies in the project directory.
 *
 * @param {string} projectPath - The project directory.
 */
export async function installDependencies(projectPath: string): Promise<void> {
    const execAsync = util.promisify(exec);

    try {
        await execAsync(`cd ${projectPath} && npm i`);
    } catch (error) {
        throw new Error('Installation of dependencies failed.');
    }
}
