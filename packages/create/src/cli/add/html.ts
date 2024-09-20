import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { generatePreviewFiles } from '@sap-ux/preview-middleware';
import { isAbsolute, join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';

/**
 * Adds a command to add the virtual html files hosted by the preview middleware to the file system.
 *
 * @param cmd - commander command for adding virtual html files
 */
export function addAddHtmlFilesCmd(cmd: Command): void {
    cmd.command('html [path]')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
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
 * @param simulate - if true, do not write but just show what would be change; otherwise write
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
