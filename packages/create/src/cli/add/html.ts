import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { generatePreviewFiles } from '@sap-ux/preview-middleware';
import { isAbsolute, join } from 'node:path';
import { UI5Config } from '@sap-ux/ui5-config';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';
import { FileName } from '@sap-ux/project-access';

/**
 * Adds a command to add the virtual html files hosted by the preview middleware to the file system.
 *
 * @param cmd - commander command for adding navigation inbounds config command
 */
export function addAddHtmlFilesCmd(cmd: Command): void {
    cmd.command('html [path]')
        .description(
            `Add HTML files for local preview and testing to the project. It uses the configuration from the \`ui5.yaml\` file as default, as provided by the \`fiori-tools-preview\` or \`preview-middleware\`.
                                     Example usage:
                                     \`$ npx -y @sap-ux/create@latest add html\``
        )
        .option('-c, --config <string>', 'Path to the project configuration file in YAML format.', FileName.Ui5Yaml)
        .option('-s, --simulate', 'Simulate only. Do not write to the config file. Also, sets `--verbose`')
        .option('-v, --verbose', 'Show verbose information.')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addHtmlFiles(path || process.cwd(), !!options.simulate, options.config);
        });
}

/**
 * Adds the virtual html files hosted by the preview middleware to the file system.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 * @param yamlPath - path to the ui5*.yaml file
 */
async function addHtmlFiles(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add html for path '${basePath}', simulate is '${simulate}'`);
        const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
        await validateBasePath(basePath, ui5ConfigPath);

        const fs = create(createStorage());
        const ui5Conf = await UI5Config.newInstance(fs.read(ui5ConfigPath));
        const preview =
            ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
            ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');

        await generatePreviewFiles(basePath, preview?.configuration ?? {}, fs, logger);
        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add html '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}
