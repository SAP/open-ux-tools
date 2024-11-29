import { create, Editor } from 'mem-fs-editor';
import type { Command } from 'commander';
import { create as createStorage } from 'mem-fs';
import { FileName, getWebappPath, type ManifestNamespace } from '@sap-ux/project-access';
import { type FLPConfigAnswers, getPrompts, FLPConfigPromptOptions } from '@sap-ux/flp-config-inquirer';
import { generateInboundNavigationConfig, readManifest } from '@sap-ux/app-config-writer';

import { promptYUIQuestions } from '../../common';
import { validateBasePath } from '../../validation';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { join } from 'path';
import { existsSync } from 'fs';
import { generateInboundConfig, getAdpConfig, getVariant, ManifestService } from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';

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
 * Adds an inbound navigation config to an app. To prevent overwriting existing inbounds will be checked.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be changed; otherwise write
 */
async function addInboundNavigationConfig(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        logger.debug(`Called add inbound navigation-config for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);
        const isAdp = await isAdpProject(basePath);

        const fs = create(createStorage());

        const inbounds = await getInboundsFromManifest(basePath, isAdp, fs, logger);

        const config = await getUserConfig(inbounds, isAdp);

        if (!config) {
            logger.info('User chose not to overwrite existing inbound navigation configuration.');
            return;
        }

        console.log(JSON.stringify(config, null, 2)); // TODO: Remove after testing

        if (isAdp) {
            generateInboundConfig(basePath, config as any, fs);
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
 * Determines whether the project at the given base path is an Adaptation Project (ADP).
 *
 * @param {string} basePath - The base path to the project.
 * @returns {Promise<boolean>} A promise that resolves to true if the project is an ADP project, or false otherwise.
 * @throws {Error} If the project type cannot be determined.
 */
async function isAdpProject(basePath: string): Promise<boolean> {
    const manifestPath = await getWebappPath(basePath);
    if (existsSync(join(manifestPath, FileName.Manifest))) {
        return false;
    } else if (existsSync(join(manifestPath, FileName.ManifestAppDescrVar))) {
        return true;
    }

    throw new Error('Project type could not be determined');
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
 * @param inbounds - The existing inbounds to avoid conflicts.
 * @returns {Promise<FLPConfigAnswers | undefined>} The user-provided configuration or undefined if skipped.
 */
async function getUserConfig(
    inbounds: ManifestNamespace.Inbound | undefined,
    isAdp: boolean
): Promise<FLPConfigAnswers | undefined> {
    let promptOptions: FLPConfigPromptOptions;

    if (!isAdp) {
        promptOptions = {
            inboundId: { hide: true },
            parameterString: { hide: true },
            createAnotherInbound: { hide: true }
        };
    } else {
        promptOptions = { overwrite: { hide: true } };
    }

    const config = await promptYUIQuestions(await getPrompts(inbounds, promptOptions), false);

    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return config?.overwrite === false ? undefined : config;
}
