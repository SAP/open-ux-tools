import { join } from 'path';
import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import {
    generateInboundConfig,
    getAdpConfig,
    getInboundsFromManifest,
    getVariant,
    filterAndMapInboundsToManifest
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import { getPrompts } from '@sap-ux/flp-config-inquirer';
import { FileName, getAppType } from '@sap-ux/project-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { InternalInboundNavigation } from '@sap-ux/adp-tooling';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { generateInboundNavigationConfig, readManifest } from '@sap-ux/app-config-writer';
import {
    type FLPConfigAnswers,
    type FLPConfigPromptOptions,
    getAdpFlpConfigPromptOptions,
    getAdpFlpInboundsWriterConfig,
    getTileSettingsQuestions,
    type TileSettingsAnswers
} from '@sap-ux/flp-config-inquirer';
import type { Inbound } from '@sap-ux/axios-extension';

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

        const appType = await getAppType(basePath);
        const isAdp = appType === 'Fiori Adaptation';

        const fs = create(createStorage());

        const inbounds = await getInbounds(basePath, isAdp, fs, logger);
        let tileSettingsAnswers: TileSettingsAnswers | undefined;
        if (inbounds && isAdp) {
            tileSettingsAnswers = await promptYUIQuestions(getTileSettingsQuestions(), false);
        }

        const answers = await getUserAnswers(inbounds, isAdp, tileSettingsAnswers);

        if (!answers) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        if (isAdp) {
            const config = getAdpFlpInboundsWriterConfig(answers, tileSettingsAnswers);
            await generateInboundConfig(basePath, config as InternalInboundNavigation, fs);
        } else {
            await generateInboundNavigationConfig(basePath, answers, true, fs);
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
 * Retrieves the inbounds for the given project, handling both ADP and Fiori scenarios.
 *
 * @param {string} basePath - The base path to the project.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @param {Editor} fs - The mem-fs editor instance.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {Promise<ManifestNamespace.Inbound | undefined>} The inbounds from the manifest or mapped from the system.
 */
async function getInbounds(
    basePath: string,
    isAdp: boolean,
    fs: Editor,
    logger: ToolsLogger
): Promise<ManifestNamespace.Inbound | undefined> {
    if (isAdp) {
        const appId = (await getVariant(basePath)).reference;
        const { target, ignoreCertErrors = false } = await getAdpConfig(basePath, join(basePath, FileName.Ui5Yaml));
        const provider = await createAbapServiceProvider(target, { ignoreCertErrors }, true, logger);
        const lrepService = provider.getLayeredRepository();
        const inbounds = (await lrepService.getSystemInfo(undefined, undefined, appId)).inbounds as Inbound[];
        return filterAndMapInboundsToManifest(inbounds);
    }

    const manifest = await retrieveManifest(basePath, fs);
    return getInboundsFromManifest(manifest);
}

/**
 * Retrieves the manifest for a Fiori project.
 *
 * @param {string} basePath - The base path to the project.
 * @param {Editor} fs - The mem-fs editor instance.
 * @returns {Promise<Manifest>} The base project manifest.
 */
async function retrieveManifest(basePath: string, fs: Editor): Promise<Manifest> {
    const { manifest } = await readManifest(basePath, fs);
    return manifest;
}

/**
 * Prompts the user for inbound navigation configuration.
 *
 * @param {ManifestNamespace.Inbound | undefined} inbounds - The existing inbounds if any.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @param {TileSettingsAnswers} [tileSettingsAnswers] - The answers for tile settings.
 * @returns {Promise<FLPConfigAnswers | undefined>} A promise resolving to the user-provided configuration,
 * or `undefined` if the user opts not to overwrite.
 */
async function getUserAnswers(
    inbounds: ManifestNamespace.Inbound | undefined,
    isAdp: boolean,
    tileSettingsAnswers?: TileSettingsAnswers
): Promise<FLPConfigAnswers | undefined> {
    let promptOptions: FLPConfigPromptOptions;

    if (!isAdp) {
        promptOptions = {
            inboundId: { hide: true },
            additionalParameters: { hide: true }
        };
    } else {
        promptOptions = getAdpFlpConfigPromptOptions(tileSettingsAnswers as TileSettingsAnswers, inbounds);
    }

    const prompts = await filterLabelTypeQuestions<FLPConfigAnswers>(await getPrompts(inbounds, promptOptions));
    const config = await promptYUIQuestions(prompts, false);

    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return config?.overwrite === false ? undefined : config;
}
