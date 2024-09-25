import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { generateVariantsConfig } from '@sap-ux/app-config-writer';

/**
 * Add the "add variants config" command to a passed command.
 *
 * @param cmd - commander command for adding variants config command
 */
export function addAddVariantsConfigCommand(cmd: Command): void {
    cmd.command('variants-config [path]')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addVariantsConfig(path || process.cwd(), !!options.simulate);
        });
}

/**
 * Adds a variants config to an app or project.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 */
async function addVariantsConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add variants-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const fs = await generateVariantsConfig(basePath, logger);
        await traceChanges(fs);
        if (!simulate) {
            fs.commit(() => logger.info(`Variants configuration written.`));
        }
    } catch (error) {
        logger.error(`Error while executing add variants-config '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
