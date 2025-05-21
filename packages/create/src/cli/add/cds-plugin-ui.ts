import { relative } from 'path';
import type { Command } from 'commander';
import { enableCdsUi5Plugin } from '@sap-ux/cap-config-writer';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { runNpmInstallCommand } from '../../common';

/**
 * Add the "add cds-plugin-ui5" command to passed command.
 *
 * @param cmd - commander command for adding cds-plugin-ui5 command
 */
export function addAddCdsPluginUi5Command(cmd: Command): void {
    cmd.command('cds-plugin-ui5 [path]')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only, do not write or install; sets also --verbose')
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
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param skipInstall - if true, skip execution of npm install
 */
async function addCdsPluginUi5(basePath: string, simulate: boolean, skipInstall: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(
            `Called add cds-plugin-ui5 for path '${basePath}', simulate is '${simulate}', skip install is '${skipInstall}'`
        );
        const fs = await enableCdsUi5Plugin(basePath);
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
                    runNpmInstallCommand(basePath);
                }
            });
        }
    } catch (error) {
        logger.error(`Error while adding cds-plugin-ui5 '${error?.toString()}'`);
        logger.debug(error as Error);
    }
}
