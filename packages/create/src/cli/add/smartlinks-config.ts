import type { Command } from 'commander';
import { generateSmartLinksConfig, getSmartLinksTargetFromPrompt } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';

/**
 * Add the "add smartlinks config" command to a passed command.
 *
 * @param cmd - commander command for adding smartlinks config command
 */
export function addAddSmartLinksConfigCommand(cmd: Command): void {
    cmd.command('smartlinks-config [path]')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addSmartLinksConfig(path || process.cwd(), !!options.simulate);
        });
}

/**
 * Adds a smartLinks config to an app or project.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 */
async function addSmartLinksConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add smartlinks-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const config = await getSmartLinksTargetFromPrompt(basePath, logger);
        const fs = await generateSmartLinksConfig(basePath, config, logger);
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() => logger.info(`SmartLinks configuration written.`));
        }
    } catch (error) {
        logger.error(`Error while executing add smartlinks-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
