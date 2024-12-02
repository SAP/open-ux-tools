import { join } from 'path';
import {
    flpConfigurationExists,
    generateInboundConfig,
    getAdpConfig,
    getVariant,
    isAdpProject,
    ManifestService
} from '@sap-ux/adp-tooling';
import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import type { ToolsLogger } from '@sap-ux/logger';
import { create, type Editor } from 'mem-fs-editor';
import { getPrompts } from '@sap-ux/flp-config-inquirer';
import type { InternalInboundNavigation } from '@sap-ux/adp-tooling';
import { FileName, type ManifestNamespace } from '@sap-ux/project-access';
import { generateInboundNavigationConfig, readManifest } from '@sap-ux/app-config-writer';
import type { FLPConfigAnswers, FLPConfigPromptOptions } from '@sap-ux/flp-config-inquirer';

import { promptYUIQuestions } from '../../common';
import { validateBasePath } from '../../validation';
import { filterLabelTypeQuestions } from '../../common/prompts';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';

/**
 * Add the "add inbound-navigation" command to a passed command.
 *
 * @param cmd - commander command for adding navigation inbounds config command
 */
export function addInboundNavigationConfigCommand(cmd: Command): void {
    cmd.command('inbound-navigation [path]')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addInboundNavigationConfig(path || process.cwd(), !!options.simulate);
        });
}

/**
 * Adds an inbound navigation configuration to an app. Checks existing inbounds to prevent overwriting.
 *
 * @param {string} basePath - The path to the application root.
 * @param {boolean} simulate - If true, simulates the changes without writing them; otherwise, writes changes.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function addInboundNavigationConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add inbound navigation-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const isAdp = await isAdpProject(basePath);

        if (isAdp && flpConfigurationExists(basePath)) {
            logger.info('FLP Configuration already exists.');
            return;
        }

        const fs = create(createStorage());

        const inbounds = await getInboundsFromManifest(basePath, isAdp, fs, logger);

        const config = await getUserConfig(basePath, inbounds, isAdp);

        if (!config) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        if (isAdp) {
            await generateInboundConfig(basePath, config as InternalInboundNavigation, fs);
        } else {
            await generateInboundNavigationConfig(basePath, config, true, fs);
        }

        if (!simulate) {
            fs.commit(() => logger.info(`Inbound navigation configuration complete.`));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add inbound navigation configuration '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

/**
 * Retrieves the inbound navigation configurations from the project's manifest.
 *
 * @param {string} basePath - The base path to the project.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @param {Editor} fs - The mem-fs editor instance.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {Promise<ManifestNamespace.Inbound | undefined>} A promise that resolves to the inbounds, or undefined if none are found.
 */
async function getInboundsFromManifest(
    basePath: string,
    isAdp: boolean,
    fs: Editor,
    logger: ToolsLogger
): Promise<ManifestNamespace.Inbound | undefined> {
    let manifest: ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;
    if (!isAdp) {
        manifest = (await readManifest(basePath, fs))?.manifest;
    } else {
        const variant = getVariant(basePath);
        const config = await getAdpConfig(basePath, join(basePath, FileName.Ui5Yaml));

        const manifestService = await ManifestService.initMergedManifest(basePath, variant, config, logger);

        manifest = manifestService.getManifest();
    }

    return manifest?.['sap.app']?.crossNavigation?.inbounds;
}

/**
 * Prompts the user for inbound navigation configuration.
 *
 * @param {string} basePath - The base path to the project.
 * @param {ManifestNamespace.Inbound | undefined} inbounds - The existing inbounds if any.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @returns {Promise<FLPConfigAnswers | undefined>} The user-provided configuration, or undefined if the user chooses not to overwrite.
 */
async function getUserConfig(
    basePath: string,
    inbounds: ManifestNamespace.Inbound | undefined,
    isAdp: boolean
): Promise<FLPConfigAnswers | undefined> {
    let appId: string = '';
    let promptOptions: FLPConfigPromptOptions;

    if (!isAdp) {
        promptOptions = {
            inboundId: { hide: true },
            parameterString: { hide: true },
            createAnotherInbound: { hide: true },
            emptyInboundsInfo: { hide: true }
        };
    } else {
        promptOptions = { overwrite: { hide: true }, createAnotherInbound: { hide: true } };
        appId = getVariant(basePath)?.id;
    }

    const prompts = await filterLabelTypeQuestions<FLPConfigAnswers>(await getPrompts(inbounds, appId, promptOptions));
    const config = await promptYUIQuestions(prompts, false);

    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return config?.overwrite === false ? undefined : config;
}
