import type { Command } from 'commander';
import { removeSmartLinksConfig } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { hasFileDeletes, validateBasePath } from '../../validation';
import prompts from 'prompts';

/**
 * Add the "remove smartlinks config" command to a passed command.
 *
 * @param cmd - commander command for removing smartlinks config command
 */
export function addRemoveSmartLinksConfigCommand(cmd: Command): void {
    cmd.command('smartlinks-config [path]')
        .option('-v, --verbose', 'show verbose information')
        .option('-f, --force', 'do not ask for confirmation when deleting files')
        .action(async (path, options) => {
            if (options.verbose === true) {
                setLogLevelVerbose();
            }
            await removeSmartLinksConfiguration(path || process.cwd(), !!options.force);
        });
}

/**
 * Removes a smartLinks config from an app or project.
 *
 * @param basePath - path to application root
 * @param force - if true, do not ask before deleting files; otherwise ask
 */
async function removeSmartLinksConfiguration(basePath: string, force: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called remove smartlinks-config for path '${basePath}', force is '${force}'`);
        validateBasePath(basePath);
        const fs = await removeSmartLinksConfig(basePath, logger);
        await traceChanges(fs);
        const hasDeletions = hasFileDeletes(fs);
        let doCommit = true;
        if (hasDeletions && !force) {
            doCommit = (
                await prompts([
                    {
                        type: 'confirm',
                        name: 'doCommit',
                        message: `Do you want to apply the changes?`
                    }
                ])
            ).doCommit;
        }
        if (doCommit) {
            fs.commit(() => {
                logger.info(`Smartlinks config removed`);
            });
        }
    } catch (error) {
        logger.error(`Error while executing remove smartlinks-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
