import type { Command } from 'commander';
import type { AdpPreviewConfig, PromptDefaults } from '@sap-ux/adp-tooling';
import { generateChange, ChangeType, getPromptsForChangeDataSource, getManifest } from '@sap-ux/adp-tooling';
import { getLogger, traceChanges } from '../../tracing';
import { readFileSync, existsSync } from 'fs';
import { join, isAbsolute } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';
import { promptYUIQuestions } from '../../common';
import { getAppType } from '@sap-ux/project-access';
import { getVariant } from '../../common/utils';

let loginAttempts = 3;

/**
 * Add a new sub-command to change the data source of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change data-source sub-command to.
 */
export function addChangeDataSourceCommand(cmd: Command): void {
    cmd.command('data-source [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', 'ui5.yaml')
        .action(async (path, options) => {
            await changeDataSource(path, { ...options }, !!options.simulate, options.config);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {PromptDefaults} defaults - The default values for the prompts.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 * @param {string} yamlPath - The path to the project configuration file in YAML format.
 */
async function changeDataSource(
    basePath: string,
    defaults: PromptDefaults,
    simulate: boolean,
    yamlPath: string
): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }
        if ((await getAppType(basePath)) !== 'Fiori Adaptation') {
            throw new Error('This command can only be used for an Adaptation Project');
        }
        checkEnvironment(basePath);

        const variant = getVariant(basePath);
        const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
        const ui5Conf = await UI5Config.newInstance(readFileSync(ui5ConfigPath, 'utf-8'));
        const customMiddlerware =
            ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
            ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');
        const adp = customMiddlerware?.configuration?.adp;
        if (!adp) {
            throw new Error('No system configuration found in ui5.yaml');
        }
        const manifest = await getManifest(variant.reference, adp, logger);
        const dataSources = manifest['sap.app'].dataSources;
        if (!dataSources) {
            throw new Error('No data sources found in the manifest');
        }
        const answers = await promptYUIQuestions(getPromptsForChangeDataSource(dataSources), false);

        const fs = await generateChange<ChangeType.CHANGE_DATA_SOURCE>(basePath, ChangeType.CHANGE_DATA_SOURCE, {
            variant,
            dataSources,
            answers
        });

        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(error.message);
        if (error.response?.status === 401 && loginAttempts) {
            loginAttempts--;
            logger.error(`Authentication failed. Please check your credentials. Login attempts left: ${loginAttempts}`);
            await changeDataSource(basePath, defaults, simulate, yamlPath);
            return;
        }
        logger.debug(error);
    }
}

/**
 * Check if the project is a CF project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @throws {Error} If the project is a CF project.
 */
function checkEnvironment(basePath: string): void {
    const configJsonPath = join(basePath, '.adp', 'config.json');
    if (existsSync(configJsonPath)) {
        const config = JSON.parse(readFileSync(configJsonPath, 'utf-8'));
        if (config.environment === 'CF') {
            throw new Error('Changing data source is not supported for CF projects.');
        }
    }
}
