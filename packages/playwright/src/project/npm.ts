import { ToolsLogger } from '@sap-ux/logger';
import { spawnSync } from 'child_process';
import { nodeModulesUpToDate, storePackageJsonHash } from './project';

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
    return new Promise(async (resolve, reject) => {
        try {
            const skipInstallation = await skipNpmInstallation(root);
            if (!skipInstallation) {
                logger.info(
                    `Installing packages. Max time allocated is 5 min. Alternatively you can manually run 'npm install' or 'yarn install' in: ${root}`
                );
                const npm = spawnSync(`npm`, ['install', '--ignore-engines', '--force'], {
                    cwd: root,
                    shell: true,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: 5 * 60000 // 5 min
                });
                if (npm.status && npm.status !== 0) {
                    const errorText = npm.stderr?.toString();
                    throw new Error(errorText);
                }
                logger.info(`npm spawnSync.status: ${npm.status?.toString()}`);
                logger.info(`npm spawnSync.stderr: ${npm.stderr?.toString()}`);
                logger.info(`npm spawnSync.stdout: ${npm.stdout?.toString()}`);
                const versions = spawnSync(`npm`, ['list', '--depth=0'], {
                    cwd: root,
                    shell: true,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: 5 * 60000 // 5 min
                });
                logger.info(`npm list spawnSync.stdout: ${versions.stdout?.toString()}`);
                logger.info(`Installation finished in ${root}`);
                await storePackageJsonHash(root);
                resolve();
            }
        } catch (error) {
            logger.info(`Could not install package in  ${root}`);
            reject(error);
        }
    });
};
