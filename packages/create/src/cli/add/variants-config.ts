import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { generateVariantsConfig } from '@sap-ux/app-config-writer';
import { isAbsolute, join } from 'node:path';
import { FileName } from '@sap-ux/project-access';

/**
 * Add the "add variants config" command to a passed command.
 *
 * @param cmd - commander command for adding variants config command
 */
export function addAddVariantsConfigCommand(cmd: Command): void {
    cmd.command('variants-config [path]')
        .description(
            `Add the necessary configuration to an existing YAML file and the script to the \`package.json\` file for variants creation. It uses the configuration from the YAML file passed by the CLI or default to \`ui5.yaml\`, as provided by the \`fiori-tools-preview\` or \`preview-middleware\`.
                                     Example usage:
                                     \`npx --yes @sap-ux/create@latest add variants-config\``
        )
        .option(
            '-c, --config <string>',
            'Path to the project configuration file in YAML format.',
            FileName.Ui5Yaml
        )
        .option('-s, --simulate', 'Simulate only. Do not write to the config file. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addVariantsConfig(path || process.cwd(), !!options.simulate, options.config);
        });
}

/**
 * Adds a variants config to an app or project.
 * The command will update the package.json file with the ‘start-variant-management’ script and will use the configuration in yaml format passed by cli or default to the ui5.yaml file, if given.
 *
 * @param basePath - the base path where the package.json and ui5.yaml is
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param yamlPath - path to the ui5*.yaml file passed by cli
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
