import { ToolsLogger } from '@sap-ux/logger';
import { nodeModulesUpToDate, storePackageJsonHash } from './project';
import { spawn } from 'promisify-child-process';

const logger = new ToolsLogger();

/**
 * Installation of npm is skipped when
 * 1. `root` is undefined
 * 2. 'node_modules' folder exist and is up to date.
 *
 * @param root project root
 * @returns boolean
 */
const skipNpmInstallation = async (root: string): Promise<boolean> => {
    if (!root) {
        logger.info('"npm install": skipped as "workspace" is undefined');
        return true;
    }
    if (await nodeModulesUpToDate(root)) {
        logger.info('"npm install": skipped');
        return true;
    }
    return false;
};

/**
 * Install project dependencies through `npm install --ignore-engines --force` command.
 *
 * @param root project root
 */
export const install = async (root: string): Promise<void> => {
    const skipInstallation = await skipNpmInstallation(root);
    if (skipInstallation) {
        return;
    }
    logger.info(
        `Installing packages. Max time allocated is 5 min. Alternatively you can manually run 'npm install' or 'yarn install' in: ${root}`
    );
    const { stdout, stderr, code } = await spawn(`npm`, ['install', '--ignore-engines', '--force'], {
        cwd: root,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 5 * 60000 // 5 min
    });
    if (code && code !== 0) {
        throw new Error(stderr?.toString());
    }
    logger.info(`npm spawn.stderr: ${stderr?.toString()}`);
    logger.info(`npm spawn.stdout: ${stdout?.toString()}`);
    const versions = await spawn(`npm`, ['list', '--depth=0'], {
        cwd: root,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
        timeout: 5 * 60000 // 5 min
    });
    logger.info(`npm list spawn.stdout: ${versions.stdout?.toString()}`);
    logger.info(`Installation finished in ${root}`);
    await storePackageJsonHash(root);
};
