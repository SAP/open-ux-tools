import { join } from 'path';
import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import {
    flpConfigurationExists,
    generateInboundConfig,
    getAdpConfig,
    getInboundsFromManifest,
    getRegistrationIdFromManifest,
    getVariant,
    ManifestService
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import { getPrompts } from '@sap-ux/flp-config-inquirer';
import { FileName, getAppType } from '@sap-ux/project-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { InternalInboundNavigation } from '@sap-ux/adp-tooling';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
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

        const appType = await getAppType(basePath);
        const isAdp = appType === 'Fiori Adaptation';

        if (isAdp && (await flpConfigurationExists(basePath))) {
            logger.info('FLP Configuration already exists.');
            return;
        }

        const fs = create(createStorage());

        const manifest = await getManifest(basePath, isAdp, fs, logger);
        const inbounds = getInboundsFromManifest(manifest);

        const answers = await getUserAnswers(inbounds, isAdp);

        if (!answers) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        if (isAdp) {
            const config = {
                inboundId: `${answers.semanticObject}-${answers.action}`,
                ...answers
            };
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
 * Retrieves the project's manifest file, handling both Fiori and Adaptation project scenarios.
 *
 * @param {string} basePath - The base path to the project.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @param {Editor} fs - The mem-fs editor instance.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {Promise<Manifest>} The manifest file content.
 * @throws {Error} If the project is not CloudReady or the manifest cannot be retrieved.
 */
export async function getManifest(
    basePath: string,
    isAdp: boolean,
    fs: Editor,
    logger: ToolsLogger
): Promise<Manifest> {
    if (isAdp) {
        return retrieveMergedManifest(basePath, logger);
    }
    return retrieveManifest(basePath, fs);
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
 * Retrieves the manifest for an Adaptation Project (ADP).
 *
 * @param {string} basePath - The base path to the ADP project.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {Promise<Manifest>} The merged manifest for the ADP project.
 * @throws {Error} If the project is not CloudReady.
 */
async function retrieveMergedManifest(basePath: string, logger: ToolsLogger): Promise<Manifest> {
    const variant = await getVariant(basePath);
    const { target, ignoreCertErrors = false } = await getAdpConfig(basePath, join(basePath, FileName.Ui5Yaml));

    const provider = await createAbapServiceProvider(target, { ignoreCertErrors }, true, logger);

    const manifestService = await ManifestService.initMergedManifest(provider, basePath, variant, logger);
    return manifestService.getManifest();
}

/**
 * Prompts the user for inbound navigation configuration.
 *
 * @param {ManifestNamespace.Inbound | undefined} inbounds - The existing inbounds if any.
 * @param {boolean} isAdp - Indicates whether the project is an ADP project.
 * @returns {Promise<FLPConfigAnswers | undefined>} A promise resolving to the user-provided configuration,
 * or `undefined` if the user opts not to overwrite.
 */
async function getUserAnswers(
    inbounds: ManifestNamespace.Inbound | undefined,
    isAdp: boolean
): Promise<FLPConfigAnswers | undefined> {
    let promptOptions: FLPConfigPromptOptions;

    if (!isAdp) {
        promptOptions = {
            inboundId: { hide: true },
            additionalParameters: { hide: true }
        };
    } else {
        promptOptions = { overwrite: { hide: true } };
    }

    const prompts = await filterLabelTypeQuestions<FLPConfigAnswers>(await getPrompts(inbounds, promptOptions));
    const config = await promptYUIQuestions(prompts, false);

    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return config?.overwrite === false ? undefined : config;
}
