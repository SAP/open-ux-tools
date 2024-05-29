import type { Command } from 'commander';
import type { AdpPreviewConfig, DescriptorVariant, PromptDefaults } from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import { generateChange, ChangeType, getPromptsForChangeDataSource } from '@sap-ux/adp-tooling';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { getLogger, traceChanges } from '../../tracing';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';
import { promptYUIQuestions } from '../../common';

let loginAttempts = 3;

/**
 * Add a new sub-command to change the data source of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change-data-source sub-command to.
 */
export function addChangeDataSourceCommand(cmd: Command): void {
    cmd.command('change-data-source [path]')
        .option('-s, --simulate', 'simulate only do not write or install')
        .action(async (path, options) => {
            await changeDataSource(path, { ...options }, !!options.simulate);
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {PromptDefaults} defaults - The default values for the prompts.
 * @param {boolean} simulate - If set to true, then no files will be written to the filesystem.
 */
async function changeDataSource(basePath: string, defaults: PromptDefaults, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        if (!basePath) {
            basePath = process.cwd();
        }
        checkEnvironment(basePath);

        const variant = getVariant(basePath);
        const manifest = await getManifest(basePath, defaults, logger, variant);
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
            await changeDataSource(basePath, defaults, simulate);
            return;
        }
        logger.debug(error);
    }
}

/**
 * Get the manifest of the base application.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {PromptDefaults} defaults - The default values for the prompts.
 * @param {ToolsLogger} logger - The logger.
 * @param {DescriptorVariant} variant - The app descriptor variant.
 * @returns {Promise<Manifest>} The manifest.
 */
async function getManifest(
    basePath: string,
    defaults: PromptDefaults,
    logger: ToolsLogger,
    variant: DescriptorVariant
): Promise<Manifest> {
    const ui5Config = await UI5Config.newInstance(readFileSync(join(basePath, 'ui5.yaml'), 'utf-8'));
    const adp = ui5Config.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview')?.configuration?.adp;
    if (!adp) {
        throw new Error('No system configuration found in ui5.yaml');
    }
    const target = adp.target;
    const ignoreCertErrors = adp.ignoreCertErrors;
    const provider = await createAbapServiceProvider(
        target,
        {
            ignoreCertErrors
        },
        true,
        logger
    );

    const appIndexService = provider.getAppIndex();
    const manifestUrl = await appIndexService.getManifestUrl(variant.reference);
    const lrepService = provider.getLayeredRepository();
    return await lrepService.getManifest(manifestUrl);
}

/**
 * Get the app descriptor variant.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {DescriptorVariant} The app descriptor variant.
 */
function getVariant(basePath: string): DescriptorVariant {
    return JSON.parse(readFileSync(join(basePath, 'webapp', 'manifest.appdescr_variant'), 'utf-8'));
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
