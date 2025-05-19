import type { Command } from 'commander';
import { enableCardGeneratorConfig } from '@sap-ux/app-config-writer';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';

/**
 * Add the cards-editor command.
 *
 * @param cmd - commander command for adding card editor config command
 */
export function addCardsEditorConfigCommand(cmd: Command): void {
    cmd.command('cards-editor [path]')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
        .option('-n, --skip-install', 'skip npm install step')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addCardsGeneratorConfig(path ?? process.cwd(), !!options.simulate, options.config);
        });
}

/**
 * Adds an cards generator config to an app. To prevent overwriting existing inbounds will be checked.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param yamlPath - path to the ui5*.yaml file passed by cli
 */
async function addCardsGeneratorConfig(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add cards-generator-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const fs = await enableCardGeneratorConfig(basePath, yamlPath, logger);
        if (!simulate) {
            fs.commit(() => logger.info(`Card Generator configuration written.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add cards generator configuration '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
