import type { Command } from 'commander';
import prompts from 'prompts';
import { removeMockserverConfig } from '@sap-ux/mockserver-config-writer';
import { getLogger, setLogLevelVerbose, traceChanges } from '../../tracing';
import { hasFileDeletes, validateBasePath } from '../../validation';

/**
 * Add the "add mockserver config" command to a passed command.
 *
 * @param cmd - commander command for adding mockserver config command
 */
export function addRemoveMockserverConfigCommand(cmd: Command): void {
    cmd.command('mockserver-config [path]')
        .option('-v, --verbose', 'show verbose information')
        .option('-f, --force', 'do not ask for confirmation when deleting files')
        .action(async (path, options) => {
            if (options.verbose === true) {
                setLogLevelVerbose();
            }
            await removeMockserverConfiguration(path || process.cwd(), !!options.force);
        });
}

/**
 * Removes a mockserver config from an app or project.
 *
 * @param basePath - path to application root
 * @param force - if true, do not ask before deleting files; otherwise ask
 */
async function removeMockserverConfiguration(basePath: string, force: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called remove mockserver-config for path '${basePath}', force is '${force}'`);
        await validateBasePath(basePath);
        const fs = removeMockserverConfig(basePath);
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
                logger.info(`Mockserver config removed`);
            });
        }
    } catch (error) {
        logger.error(`Error while executing remove mockserver-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
