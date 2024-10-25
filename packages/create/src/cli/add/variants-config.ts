import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { generateVariantsConfig } from '@sap-ux/app-config-writer';
import { isAbsolute, join } from 'path';

/**
 * Add the "add variants config" command to a passed command.
 *
 * @param cmd - commander command for adding variants config command
 */
export function addAddVariantsConfigCommand(cmd: Command): void {
    cmd.command('variants-config [path]')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addVariantsConfig(path || process.cwd(), !!options.simulate, options.config);
        });
}

/**
 * Adds a variants config to an app or project.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param yamlPath - path to the ui5*.yaml file
 */
async function addVariantsConfig(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add variants-config for path '${basePath}', simulate is '${simulate}'`);
        const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
        await validateBasePath(basePath, ui5ConfigPath);
        const fs = await generateVariantsConfig(basePath, ui5ConfigPath, logger);
        if (!simulate) {
            fs.commit(() => logger.info(`Variants configuration written.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add variants-config: ${(error as Error).message}`);
        logger.debug(error as Error);
    }
}
