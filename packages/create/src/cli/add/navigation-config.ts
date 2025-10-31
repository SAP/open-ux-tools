import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import {
    generateInboundConfig,
    getAdpConfig,
    getInboundsFromManifest,
    getVariant,
    getBaseAppInbounds,
    type InternalInboundNavigation,
    type DescriptorVariant
} from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';
import { getPrompts } from '@sap-ux/flp-config-inquirer';
import { FileName, getAppType } from '@sap-ux/project-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
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

import { promptYUIQuestions } from '../../common';
import { validateBasePath } from '../../validation';
import { filterLabelTypeQuestions } from '../../common/prompts';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';

type Variant = { isAdp: true; content: DescriptorVariant } | { isAdp: false; content: undefined };

/**
 * Add the "add inbound-navigation" command to a passed command.
 *
 * @param cmd - commander command for adding navigation inbounds config command
 */
export function addInboundNavigationConfigCommand(cmd: Command): void {
    cmd.command('inbound-navigation [path]')
        .description(`Add Fiori Launchpad inbound navigation configuration to a project.
                                     Example usage:
                                     \`$ npx -y @sap-ux/create@latest add inbound-navigation\``
        )
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .option('-c, --config <string>', 'Path to project configuration file in YAML format', FileName.Ui5Yaml)
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addInboundNavigationConfig(path || process.cwd(), !!options.simulate, options.config);
        });
}

/**
 * Adds an inbound navigation configuration to an app. Checks existing inbounds to prevent overwriting.
 *
 * @param {string} basePath - The path to the application root.
 * @param {boolean} simulate - If true, simulates the changes without writing them; otherwise, writes changes.
 * @param {string} yamlPath - The path to the project configuration file in YAML format.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
async function addInboundNavigationConfig(basePath: string, simulate: boolean, yamlPath: string): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add inbound navigation-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const appType = await getAppType(basePath);
        const isAdp = appType === 'Fiori Adaptation';

        const fs = create(createStorage());

        let variant: Variant;

        if (!isAdp) {
            variant = { isAdp: false, content: undefined };
        } else {
            variant = { isAdp: true, content: await getVariant(basePath, fs) };
        }

        const inbounds = await getInbounds(basePath, yamlPath, fs, logger, variant);
        let tileSettingsAnswers: TileSettingsAnswers | undefined;
        if (inbounds && isAdp) {
            tileSettingsAnswers = await promptYUIQuestions(getTileSettingsQuestions(), false);
        }

        const answers = await getUserAnswers(inbounds, isAdp, tileSettingsAnswers);

        if (!answers) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        if (variant.isAdp) {
            const config = getAdpFlpInboundsWriterConfig(answers, variant.content.layer, tileSettingsAnswers);
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
 * @param {string} yamlPath - The path to the project configuration file in YAML format.
 * @param {Editor} fs - The mem-fs editor instance.
 * @param {ToolsLogger} logger - The logger instance.
 * @param {DescriptorVariant} [variant] - The descriptor variant, if applicable.
 * @returns {Promise<ManifestNamespace.Inbound | undefined>} The inbounds from the manifest or mapped from the system.
 */
async function getInbounds(
    basePath: string,
    yamlPath: string,
    fs: Editor,
    logger: ToolsLogger,
    variant: Variant
): Promise<ManifestNamespace.Inbound | undefined> {
    if (variant.isAdp) {
        const { target, ignoreCertErrors = false } = await getAdpConfig(basePath, yamlPath);
        const provider = await createAbapServiceProvider(target, { ignoreCertErrors }, true, logger);
        return getBaseAppInbounds(variant.content.reference as string, provider);
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
