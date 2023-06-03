import { spawnSync } from 'child_process';
import { relative } from 'path';
import type { Command } from 'commander';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { enabledCdsUi5Plugin } from '../../../../cap-config-writer/dist';

/**
 * Add the "add cds-plugin-ui5" command to passed command.
 *
 * @param cmd - commander command for adding cds-plugin-ui5 command
 */
export function addAddCdsPluginUi5Command(cmd: Command): void {
    cmd.command('cds-plugin-ui5 [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write or install; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addCdsPluginUi5(path || process.cwd(), !!options.simulate, !!options.skipInstall);
        });
}

/**
 * Add cds-plugin-ui5 and all prerequisites to a CAP project.
 *
 * @param basePath - CAP project root
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 * @param skipInstall - if true, skip execution of npm install
 */
async function addCdsPluginUi5(basePath: string, simulate: boolean, skipInstall: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(
            `Called add cds-plugin-ui5 for path '${basePath}', simulate is '${simulate}', skip install is '${skipInstall}'`
        );
        const fs = await enabledCdsUi5Plugin(basePath);
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() => {
                logger.info(`Changes to enable cds-plugin-ui5 written`);
                if (skipInstall) {
                    logger.warn('To finish enablement of cds-plugin-ui5 run commands:');
                    const relPath = relative(basePath, process.cwd());
                    if (relPath) {
                        logger.info(`cd ${relPath}`);
                    }
                    logger.info('npm install');
                } else {
                    logger.debug('Running npm install command');
                    runNpmInstall(basePath);
                }
            });
        }
    } catch (error) {
        logger.error(`Error while adding cds-plugin-ui5 '${error?.toString()}'`);
        logger.debug(error as Error);
    }
}

/**
 * Run npm install in root folder of CAP.
 *
 * @param basePath - path to application root
 */
function runNpmInstall(basePath: string): void {
    const npmCommand = process.platform.startsWith('win') ? 'npm.cmd' : 'npm';
    spawnSync(npmCommand, ['install'], {
        cwd: basePath,
        stdio: [0, 1, 2]
    });
}
